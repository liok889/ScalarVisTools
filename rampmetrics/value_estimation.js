var FLASH_TIME=700;

function ValueEstimation(blocks, canvas, scaleCanvas, svgVis, svgScale)
{
	this.blocks = blocks;
	this.curBlock = 0;
	this.curTrial = -1;

	// store canvas
	this.canvas = canvas;
	this.scaleCanvas = scaleCanvas;
	var canvasSelection = d3.select(canvas);
	this.w = +canvasSelection.attr('width')
	this.h = +canvasSelection.attr('height');

	// store svgs
	this.svgVis = svgVis;
	this.svgScale = svgScale;

	// create a scalar field with same dimensions
	this.field = new ScalarField(this.w, this.h);


	// create a visualizer object
	var colormap = this.getCurColormap();
	this.vis = new ScalarVis(this.field, this.canvas, colormap);
	
	// count number of trials
	var totalAll = 0;
	var totalTrials = 0;
	var totalEngagements = 0;
	for (var b=0; b<blocks.length; b++) {
		for (var t=0; t<blocks[b].trials.length; t++)
		{
			if (blocks[b].trials[t].engagement) {
				totalEngagements++;
			}
			else {
				totalTrials++;
			}
			totalAll++;
		}
	}
	this.totalAll = totalAll;
	this.totalTrials = totalTrials;
	this.totalEngagements = totalEngagements;
	this.trialSequence = -1;

	this.nextTrial();
}

function makeCubehelix(start, rots, hues)
{
	if (!hues) hues = 1.0;
	if (!rots) rots = -1.5;
	if (!start) start = 0.5;
			
	var startAngle = (start - 1) * 120;
	var endingAngle = (start - 1) * 120 + rots * 360;
	var saturation = hues / 2.0;

	var helix = d3.scaleCubehelix()
		.domain([0, 1])
		.range([d3.hsl(startAngle,saturation,0), d3.hsl(endingAngle, saturation, 1)]);

	//var helix = d3.interpolateCubehelix("hsl(300,50%,0%)", "hsl(-240,50%,100%)");
	var colorSeq = [];
	for (var i=0; i<100; i++) {
		var t = helix(i/(100-1));
		var c = d3.rgb(t);
		colorSeq.push([c.r, c.g, c.b]);
	}

	var colormapName = 'cubehelix_' + Math.abs(rots);
	COLOR_PRESETS[colormapName] = colorSeq;

	// plot cubehelix
	var cubehelix1 = getColorPreset(colormapName, undefined, undefined, true);
	
	return cubehelix1;
}

ValueEstimation.prototype.selectPositionFromValue = function(value)
{
	var TOLERANCE = 1/100;
	var PADDING = 55;

	var w = this.w;
	var h = this.h;

	var effectiveW = w-PADDING*2;
	var effectiveH = h-PADDING*2;

	var startX, startY, prevI = null, iterations = 0;
	var done = false, fromStart = false;

	while (!done)
	{
		startX = Math.floor(Math.random() * effectiveW) + PADDING;
		startY = Math.floor(Math.random() * effectiveH) + PADDING;

		// scan from startX, startY
		var index = startX * w + startY;
		if (prevI !== null && index >= prevI) 
		{
			iterations++;
			if (iterations > 100)
			{
				startX = PADDING;
				startY = PADDING;
				fromStart = true;
				console.log("reached max iterations. from start");
			}
			else
			{
				continue;
			}
		}

		prevI = index;

		// scan
		var view = this.field.view
		for (var c=startX, r=startY; ;)
		{
			var d = view[c+r*w];
			var diff = Math.abs(d-value);
			//console.log('diff: ' + diff);
			if (diff < TOLERANCE)
			{
				return [c, r];
			}
			c++;
			if (c > w-PADDING) {
				r++;
				c = PADDING;

				if (r > h-PADDING) 
				{
					// failed
					console.log("reached end: " + c + ', ' + r)
					break;
				}
			}
		}

		if (fromStart) {
			// failed
			return null;
		}
	}
}

ValueEstimation.prototype.getCurColormap = function()
{
	if (this.curColormap) {
		return this.curColormap;
	}
	else
	{
		var block = this.blocks[this.curBlock];
		var colormapName = block.colormap;
		if (colormapName == 'cubehelix') 
		{
			// get attributes
			var rots = block.rots;
			var start = block.start;
			var hues = block.hues;

			var colormapName = 'cubehelix_' + Math.abs(block.rots);
			block.colormap = colormapName;


			var cubehelix = makeCubehelix(start, rots, hues);
			this.curColormap = cubehelix;
		}
		else
		{
			this.curColormap = getColorPreset(colormapName, undefined, undefined, true)
		}
		if (this.scaleCanvas) {
			var canvasSelection = d3.select(this.scaleCanvas);
			var w = +canvasSelection.attr('width');
			var h = +canvasSelection.attr('height');
			this.curColormap.drawColorScale(w, h, h, 'vertical', this.scaleCanvas);
		}
		return this.curColormap;
	}
}

ValueEstimation.prototype.nextTrial = function()
{
	if (TRAINING) {
		d3.select("#trainingLabel")
			.html('')
			.style('visibility', 'hidden');


		d3.select('#downArrow')
			.style('visibility', 'hidden');
		d3.select('#upArrow')
			.style('visibility', 'hidden');
	}

	if (this.finished) {
		return true;
	}

	this.curTrial++;
	this.trialSequence++;
	d3.select("#labelProgress").html( (this.trialSequence+1) + ' / ' + this.totalAll);


	var block = this.blocks[this.curBlock];

	if (block.trials.length <= this.curTrial) 
	{
		var ret = this.nextBlock();
		if (ret) {
			this.finished = true;
			return true;
		}
		else
		{
			this.curTrial = 0;
		}
	}
	
	// render trial
	this.renderTrial();

	// false means we're not done yet
	return false;
}

ValueEstimation.prototype.renderTrial = function()
{
	var MAX_ITER = 10;

	// hide canvas
	d3.select(this.canvas)
		.style('visibility', 'hidden');

	// create stimulus
	//this.field.zero();

	// find a position that matches the requested value
	var block = this.blocks[this.curBlock];
	var trial = block.trials[this.curTrial];

	// find the value
	var location = null, iterations=0;
	while (location === null && iterations < MAX_ITER) 
	{
		noiseScale=1.4;
		noiseOffset=[Math.random()*400, Math.random()*400];
		seedNoise();
		makeNoise(this.field);
		location = this.selectPositionFromValue(trial.value);
		iterations++;
	}
	this.vis.vis();


	// move the marker to the location
	d3.select("#crosshair")
		.attr('transform', 'translate(' + location[0] + ',' + location[1] + ')')
		.style('opacity', '1.0');

	(function(canvas, exp) {

		setTimeout(function() {
			// show canvas
			d3.select(canvas)
				.style('visibility', null);

			// dim the cross hairs a bit
			d3.select("#crosshair")
				.style('opacity', '0.35');

			exp.stimulusReady = Date.now();
			exp.addInputEvents();

		}, FLASH_TIME)

	})(this.canvas, this)

}

ValueEstimation.prototype.nextBlock = function()
{
	this.curBlock++;
	if (this.curBlock >= this.blocks.length) {
		return true;
	}
	else
	{
		this.curColormap = null;
		var newColormap = this.getCurColormap();
		ScalarVis.setUniversalColormap(newColormap);
	}
}

var inputMouseDown = false;

ValueEstimation.prototype.disableInput = function()
{
	this.svgScale.selectAll('path.triangle').remove();
	
	this.svgScale
		.on('mousedown', null)
		.on('mousemove', null);
	d3.select(document)
		.on('mouseup', null);
	
	d3.select("#submitButton")
		.style('visibility', 'hidden');
	inputMouseDown = false;
}

ValueEstimation.prototype.sendData = function(callback, TRIALS)
{
	var data = [];

	var ENGAGMENT_TOLERANCE = .15;
	var ACTUAL_TEROLERANCE = .20;

	var engagementCorrect = 0;
	var actualCorrect = 0;
	var stimulusNo = 0;


	// count success in engagement checks
	var blocks = this.blocks;
	for (var b=0; b<blocks.length; b++)
	{
		var block = blocks[b];
		var valueMap = {};
		var trials = block.trials;
		for (var t=0; t<trials.length; t++)
		{
			var trial = trials[t];
			var vRecord = valueMap['x' + trial.value];
			if (!vRecord) 
			{
				vRecord = {
					reps: 1,
					localNameVariation: getLocalNameVariation(
						getColorPreset(block.colormap),
						trial.value 
					)
				};

				// compute local name distance at this value location

				valueMap['x' + trial.value] = vRecord;

			}
			else {
				valueMap['x' + trial.value].reps++;
			}

			if (trial.engagement) {
				if (Math.abs(trial.responseDiff) < ENGAGMENT_TOLERANCE)
				{
					engagementCorrect++;
				}
			}
			else {
				stimulusNo++;
				if (Math.abs(trial.responseDiff) < ACTUAL_TEROLERANCE)
				{
					actualCorrect++;
				}
			}

			// compute local distance

			// add to data
			data.push({
				blockNum: b+1,
				trialNum: t+1,
				rep: vRecord.reps,
				stimulusNum: stimulusNo,
				requestedValue: trial.value,
				value: trial.valueAtLocation,
				response: trial.response,
				responseTime: trial.responseTime,
				error: trial.responseDiff,
				absError: Math.abs(trial.responseDiff),
				colormap: block.colormap,
				localNameVariation: vRecord.localNameVariation
			});
		}
	}
	this.theData = data;

	var data2send = JSON.stringify(
	{
		experimentalData: this.theData,
		engagementCorrect: engagementCorrect,
		engagementTotal: this.totalEngagements,
		engagementAccuracy: this.totalEngagements > 0 ? (engagementCorrect / this.totalEngagements) : 1.0,

		stimulusCorrect: actualCorrect,
		stimulusTotal: this.totalTrials,
		stimulusAccuracy: actualCorrect / this.totalTrials
	});

	var DATA_URL = "php/store_data.php";

	(function(experiment, trial, _data2send, _callback) {
		$.ajax({
			type: "POST",
			url: DATA_URL,
			data: _data2send,
			dataType: "json",
			contentType: "application/json; charset=utf-8",

			success: function(data)
			{
				console.log("sendData SUCCESS");
				if (_callback)
					_callback(true);
			},

			error: function(errMsg)
			{
				console.log("sendData failed: " + errMsg);
				console.log("trials left: " + (trial));
				if (trial > 0) {
					experiment.sendData(_callback, trial-1);
				}
				else
				{
					if (_callback)
						_callback(false);
				}
			}
		});
		//console.log("send complete");
	})(this, TRIALS != undefined ? TRIALS : 3, data2send, callback);

	//console.log(data2send);
}



ValueEstimation.prototype.addInputEvents = function()
{
	var SVG_Y_OFFSET = 10;
	var SVG_X_OFFSET = 50;
	var scaleCanvasWidth = +d3.select(this.scaleCanvas).attr('width')
	var scaleCanvasHeight = +d3.select(this.scaleCanvas).attr('height')
	this.selectedValue = null;

	function createTriangles(svg, m)
	{
		var t1 = [{x: 0, y: 0}, {x: -10, y:10}, {x: -10, y:-10}]
		var t2 = [{x: 0, y: 0}, {x: +10, y:10}, {x: +10, y:-10}]
		var lineGenerator = d3.line()
			.x(function(d) { return d.x;})
			.y(function(d) { return d.y;});

		m[1] = Math.max(SVG_Y_OFFSET, m[1]);
		m[1] = Math.min(scaleCanvasHeight + SVG_Y_OFFSET, m[1])

		svg.selectAll('path.triangle').remove();
		
		svg.append('path')
			.attr('transform', 'translate(' + (SVG_X_OFFSET) + ',' + m[1] + ')')
			.attr('d', lineGenerator(t1))
			.attr('class', 'triangle')
			.style('fill', '#666666');

		svg.append('path')
			.attr('transform', 'translate(' + (SVG_X_OFFSET+scaleCanvasWidth) + ',' + m[1] + ')')
			.attr('d', lineGenerator(t2))
			.attr('class', 'triangle')
			.style('fill', '#666666')

	}

	(function(exp) {
		exp.svgScale
			.on('mousedown', function() 
			{
				inputMouseDown = true;
				var m = d3.mouse(this);
				createTriangles(d3.select(this), m);

				var n = Math.min(1, Math.max(0, 1-(m[1]-SVG_Y_OFFSET)/scaleCanvasHeight));
				exp.selectedValue = n;

				if (TRAINING)
				{
					var thisTrial = exp.blocks[exp.curBlock].trials[exp.curTrial];
					var diff = thisTrial.responseDiff = n-thisTrial.value;
					if (Math.abs(diff) <= TRAINING_TOLERANCE)
					{
						d3.select("#trainingLabel")
							.html('good selection!')
							.style('visibility', 'visible');


						d3.select('#downArrow')
							.style('visibility', 'hidden');
						d3.select('#upArrow')
							.style('visibility', 'hidden');
						d3.select("#submitButton")
							.style('visibility', 'visible');
					}
					else if (diff > 0)
					{
						d3.select("#trainingLabel")
							.html('go down')
							.style('visibility', 'visible');
						d3.select('#downArrow')
							.style('visibility', 'visible');
						d3.select('#upArrow')
							.style('visibility', 'hidden');
						d3.select("#submitButton")
							.style('visibility', 'hidden');


					}
					else // diff < 0
					{
						d3.select("#trainingLabel")
							.html('go up')
							.style('visibility', 'visible');
						d3.select('#upArrow')
							.style('visibility', 'visible');
						d3.select('#downArrow')
							.style('visibility', 'hidden');

						d3.select("#submitButton")
							.style('visibility', 'hidden');

					}

				}
				else
				{
					d3.select("#submitButton")
						.style('visibility', null);
				}


			})
			.on('mousemove', function() 
			{
				var PICKER_S = 30;

				var m = d3.mouse(this);
				var mouseX = m[0];
				var mouseY = m[1];
				if (inputMouseDown) {
					var m = d3.mouse(this);
					createTriangles(d3.select(this), m);
					var n = Math.min(1, Math.max(0, 1-(m[1]-SVG_Y_OFFSET)/scaleCanvasHeight));
					exp.selectedValue = n;

					if (TRAINING)
					{
						var thisTrial = exp.blocks[exp.curBlock].trials[exp.curTrial];
						var diff = thisTrial.responseDiff = n-thisTrial.value;
						if (Math.abs(diff) <= TRAINING_TOLERANCE)
						{
							d3.select("#trainingLabel")
								.html('good selection!')
								.style('visibility', 'visible');


							d3.select('#downArrow')
								.style('visibility', 'hidden');
							d3.select('#upArrow')
								.style('visibility', 'hidden');
							d3.select("#submitButton")
								.style('visibility', 'visible');
						}
						else if (diff > 0)
						{
							d3.select("#trainingLabel")
								.html('go down')
								.style('visibility', 'visible');
							d3.select('#downArrow')
								.style('visibility', 'visible');
							d3.select('#upArrow')
								.style('visibility', 'hidden');
							d3.select("#submitButton")
								.style('visibility', 'hidden');


						}
						else // diff < 0
						{
							d3.select("#trainingLabel")
								.html('go up')
								.style('visibility', 'visible');
							d3.select('#upArrow')
								.style('visibility', 'visible');
							d3.select('#downArrow')
								.style('visibility', 'hidden');

							d3.select("#submitButton")
								.style('visibility', 'hidden');

						}

					}
				}

				// test if we're within canvas boundary
				if  ((mouseX >= SVG_X_OFFSET && mouseX <= SVG_X_OFFSET + scaleCanvasWidth) &&
					(mouseY >= SVG_Y_OFFSET && mouseY <= SVG_Y_OFFSET + scaleCanvasHeight))
				{
					var n = 1-(mouseY-SVG_Y_OFFSET)/scaleCanvasHeight;
					var c = exp.getCurColormap().mapValue(n);
					exp.svgScale.selectAll('rect.picker').remove();
					exp.svgScale.append('rect')
						.attr('x', 1)
						.attr('y', mouseY-PICKER_S/2)
						.attr('width', PICKER_S)
						.attr('height', PICKER_S)
						.attr('class', 'picker')
						.style('fill', c)
						.style('stroke', '#000000');
				}
				else
				{
					d3.selectAll('rect.picker').remove();
				}

			})
			.on('mouseout', function() {
				d3.selectAll('rect.picker').remove();
			})
		d3.select(document)	
			.on('mouseup', function() {
				inputMouseDown = false;
			});

		d3.select("#submitButton")
			.on('click', function() 
			{
				var thisTrial = exp.blocks[exp.curBlock].trials[exp.curTrial];
				thisTrial.response = exp.selectedValue;
				thisTrial.responseDiff = thisTrial.response-thisTrial.value;
				thisTrial.responseTime = Date.now() - exp.stimulusReady;
				console.log('selection: ' + thisTrial.response + ", diff: " + thisTrial.responseDiff + ', time: ' + thisTrial.responseTime);

				exp.disableInput();
				//exp.addInputEvents();
				if (exp.nextTrial()) 
				{
					console.log("finished!!");
					exp.disableInput();
					d3.select(exp.canvas).style('visibility', 'hidden');
					d3.select('#crosshair').style('visibility', 'hidden');
					d3.select("#prompt").html("Experiment complete. Saving data...");
					if (TRAINING)
					{
						window.location.href = "debrief.html";
					}
					else
					{
						exp.sendData(function(status) {
							d3.select("#prompt").html('send status: ' + status);
						});
					}

				}
			})

	})(this);
}