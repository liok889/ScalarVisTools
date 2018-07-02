var RAMP_W = 230;
var RAMP_H = 30;
var RAMP_OFF_X = 80;
var RAMP_OFF_Y = 100

var PATCH_W = 15;
var PATCH_H = 15;
var PATCH_GAP = 4;
var PATCH_OFF_X = -60
var PATCH_OFF_Y = 30;

var PLOT_H = 40;
var PLOT_OFFSET = 5;
var CONTROL_R = 4;

var PERMISSIVE_L_TUNING = false;

function ColorRamp(_colors, _svg, _colorPicker)
{
	this.colors = _colors || 
	[
		// default is black / white ramp interpolated in LAB space 
		{
			value: 0.0,
			lab: [15, 0, 0]
		}, 

		{
			value: 1.0,
			lab: [80, 0, 0] 
		}
	];

	this.colormap = null;
	this.svg = _svg;

	// create structure for the SVG
	var g = this.svg.append('g');
	g.attr('transform', 'translate(' + RAMP_OFF_X + ',' + RAMP_OFF_Y + ')');
	this.g = g;

	// create an image to be used to render the colormap onto
	this.colorRampImage = g.append('image')
		.attr('width', RAMP_W + "px").attr('height', RAMP_H + 'px');

	this.connectionLines = g.append('g');
	var controlPoints = g.append('g')
		.attr('transform', 'translate(0,' + RAMP_H + ')');

	// store a reference to the color picker tool
	this.colorPicker = _colorPicker;

	// luminance plot
	this.lPlot = g.append('g');
	this.lPlot.attr('transform', 'translate(0,' + (-PLOT_H-PLOT_OFFSET) + ')');
	this.lRect = this.lPlot.append('rect')
		.attr('width', RAMP_W).attr('height', PLOT_H)
		.style('fill', 'white').style('stroke', 'black')
	this.lPlot.append('path')
		.attr('class', 'luminancePlot')

	// initialize
	this.selectedControlPoint = null;
	this.controlPoints = controlPoints;
	this.updateSVG();
	this.updateColormap();


	// keep track of history
	this.history = [];

	// create UI elements for the ramp (to add/remove colors)
	this.addUI();

	// keep track of callbacks
	this.callbacks = [];
}

ColorRamp.prototype.registerCallback = function(callback) {
	this.callbacks.push(callback)
}

ColorRamp.prototype.fireUpdate = function() 
{
	if (this.callbacks) 
	{
		for (var i=0; i<this.callbacks.length; i++) {
			this.callbacks[i](this);
		}
	}
}

ColorRamp.prototype.getColorMap = function() {
	return this.colormap;
}

ColorRamp.prototype.addUI = function() 
{
	var g = this.svg.append('g');
	var add = g.append('image')
		.attr('xlink:href', 'img/plus.png')
		.attr('width', '20px').attr('height', '20px')
		.attr('x', 10).attr('y', RAMP_OFF_Y+7)

	var remove = g.append('image')
		.attr('xlink:href', 'img/minus.png')
		.attr('width', '20px').attr('height', '20px')
		.attr('x', 35).attr('y', RAMP_OFF_Y+7)

	g.selectAll('image')
		.on('mouseover', function() { 
			d3.select(this).style('background-color', 'red');
		})
		.on('mouseout', function() {
			d3.select(this).style('background-color', null);
		});

	(function(add, remove, ramp, svg) {
		add.on('click', function() {
			ramp.insertColor({r: 255, g: 255, b: 255});
		});

		remove.on('click', function() {
			ramp.removeColor();
		})

		svg.on('dblclick', function() {
			
			if (!isNaN(ramp.selectedControlPoint)) {
				ramp.unselectControlPoint();
			}
		
		})

		ramp.colorPicker.registerCallback('pick', function(c) {
			ramp.pickColor(c);
		});

		// ramp image double click adds a new colors
		ramp.lRect.on('dblclick', function() 
		{

			var m = d3.mouse(this);
			m[0] = m[0]/RAMP_W;
			m[1] = 1-m[1]/PLOT_H;


			// find an index where to insert the new control point
			var cs = ramp.colors;
			for (var i=0; i<cs.length-1; i++) {
				var j1=i, j2=i+1;

				if (cs[j1].value+0.03 < m[0] && cs[j2].value-0.03 > m[0]) 
				{
					// this is where we should be inserting (i.e., between i and i+1)
					var c = [m[1] * 100, 0, 0];
					ramp.colors.splice(i+1, 0, {
						value: m[0],
						lab: c
					});

					ramp.updateColormap();
					ramp.updateSVG();
					ramp.colorPicker.switchToColor(d3.lab(c[0], c[1], c[2]));
					break;
				}
			}
		});
	})(add, remove, this, this.svg);
}

ColorRamp.prototype.unselectControlPoint = function() {
	this.g.selectAll('rect.selectedColorPatch')
		.attr('class', 'colorPatch');
	this.selectedControlPoint = null;
}

ColorRamp.prototype.selectControlPoint = function(i) 
{
	this.unselectControlPoint();
	this.selectedControlPoint=i;
	this.g.selectAll('.colorPatch').each(function(d, _i) 
	{ 
		if (i==_i) {
			d3.select(this)
				.attr('class', 'colorPatch selectedColorPatch');
		}
	});
	

	// get the color
	var theColor = this.colors[i].lab;
	var c = d3.lab(theColor[0], theColor[1], theColor[2]);

}

ColorRamp.prototype.undo = function() 
{
	fireUpdate();
}

ColorRamp.prototype.pickColor = function(color) 
{
	if (this.selectedControlPoint !== null)
	{
		// create a copy of the old color map
		var older = [];
		for (i=0; i<this.colors.length; i++) 
		{
			var oldControl = this.colors[i];
			older.push({
				value: oldControl.value,
				lab: oldControl.lab
			});
		}
		this.history.push(older);

		var control = this.colors[ this.selectedControlPoint ];
		control.lab = [ color.l, color.a, color.b ];
		this.updateColormap();
		this.updateSVG();
	}
}


ColorRamp.prototype.updateSVG = function() 
{
	// create control points onto the ramp
	var controlPoints = this.controlPoints;
	var u = controlPoints.selectAll('circle').data(this.colors);
	u.exit().remove();
	u = u.enter().append('circle')
		.attr('r', 0/*CONTROL_R*/)
		.attr('class', 'controlPoint')
		.merge(u);

	u
		.attr('cx', function(d) 
		{ 
			//console.log("d.value" + d.value);
			return d.value * RAMP_W;
		})
		.attr('cy', 0);


	// create color patches and connect them to control points on the ramp
	this.patches = (function(ramp) 
	{
		var uPatches = ramp.g.selectAll('rect.colorPatch').data(ramp.colors);
		uPatches.exit().remove();

		uPatches = uPatches.enter().append('rect')
			.attr('width', PATCH_W)
			.attr('height', PATCH_H)
			.attr('class', 'colorPatch')
			.merge(uPatches);

		uPatches
			.attr('x', PATCH_OFF_X)
			.attr('y', function(d, i) {
				return RAMP_H + PATCH_OFF_Y + i * (PATCH_H + PATCH_GAP);
			})
			.style('fill', function(d) {
				var c = d3.lab(d.lab[0], d.lab[1], d.lab[2]);
				var rgb = d3.rgb(c);
				return rgb.toString()
			})
			.each(function(d, i) { 
				if (i===ramp.selectedControlPoint) {
					d3.select(this)
						.attr('class', 'colorPatch selectedColorPatch');
				}
			});

		uPatches.on('click', function(d, i) 
		{
			ramp.selectControlPoint(i);
			var c = ramp.colors[i].lab;
			ramp.colorPicker.switchToColor( d3.lab( c[0], c[1], c[2]) );
			d3.event.stopPropagation();
		});

		if (ramp.selectedControlPoint >= ramp.colors.length) {
			ramp.selectedControlPoint = null;
		}
		return uPatches;
	})(this);



	// create connections between the control points and the patches
	this.connectionLines.selectAll('g.controlPointConnection').remove();
	
	var uConnect = this.connectionLines.selectAll('g.controlPointConnection').data(this.colors)
	uConnect = uConnect.enter().append('g')
		.attr('class', 'controlPointConnection')
		.merge(uConnect);
	uConnect
		.each(function(d, i) {
			var l1 = d3.select(this).append('line');
			var l2 = d3.select(this).append('line');

			var y1 = RAMP_H + PATCH_OFF_Y + i * (PATCH_H + PATCH_GAP) + PATCH_H/2;
			l1
				.attr('x1', PATCH_OFF_X+PATCH_W).attr('x2', RAMP_W * d.value)
				.attr('y1', y1).attr('y2', y1);

			l2
				.attr('x1', RAMP_W * d.value).attr('x2', RAMP_W * d.value)
				.attr('y1', y1).attr('y2', RAMP_H);


		});
	uConnect.exit().remove();

	// create luminance plot
	this.createLPlot();
}

ColorRamp.prototype.createLPlot = function(skipControls) 
{
	var lPath = this.lPlot.select('path');
	var lineGen = d3.line()
		.x(function(d) { return RAMP_W * d.value;})
		.y(function(d) { return PLOT_H * (1-d.lab[0]/100);});
	lPath.attr('d', lineGen(this.colors));

	if (skipControls) {
		return;
	}

	// add points to control luminance
	var lControls = this.lPlot.selectAll('circle.controlPoint').data(this.colors);
	lControls.exit().remove();
	lControls = lControls.enter()
		.append('circle')
		.attr('class', 'controlPoint')
		.merge(lControls);

	lControls
		.attr('r', CONTROL_R)
		.attr('cx', function(d, i) { return d.value * RAMP_W})
		.attr('cy', function(d, i) { return PLOT_H * (1-d.lab[0]/100); });

	(function(controls, ramp) 
	{


		controls
			.on('dblclick', function(d, i) {
				//if (i!=0 && i<ramp.colors.length-1) {
					ramp.removeColor(i);
				//}
				//else if (i==0 && ramp.colors.length >= 3) {

				//}
				d3.event.stopPropagation();
			})
			.on('mousedown', function(d, i) 
			{
				d3.select(this).style('stroke-width', '2px');
				var c = d.lab;
				ramp.selectControlPoint(i);
				ramp.colorPicker.switchToColor( d3.lab(c[0], c[1], c[2]) );

				ramp.lControl = { index: i, control: d, circle: d3.select(this), lastL: c[0] };
				d3.select(document)
					.on('mousemove.lControl', function() 
					{
						var m = d3.mouse(ramp.lRect.node());
						m[1] = Math.min(Math.max(0, m[1]), PLOT_H)/PLOT_H;
						m[0] = Math.min(Math.max(0, m[0]), RAMP_W)/RAMP_W;

						var c = ramp.lControl.control.lab;
						var newL = 100*(1-m[1]);

						// see if new L leads to a displayble color
						var redraw = false;
						var newLab = d3.lab(newL, c[1], c[2]);
						if (newLab.displayable() || PERMISSIVE_L_TUNING) 
						{
							if (!newLab.displayable()) {
								// convert to RGB and back to lab
								newLab = d3.lab(d3.rgb(newLab));
								newL = newLab.l;
							}

							// update
							ramp.lControl.control.lab[0] = newL;
							ramp.lControl.circle.attr('cy', m[1] * PLOT_H);

							var newC = ramp.lControl.control.lab;
						
							// redraw
							redraw = true;
							ramp.colorPicker.switchToColor( d3.lab(c[0], c[1], c[2]) );
						}

						// change horizontal position
						if (ramp.lControl.index > 0 && ramp.lControl.index < ramp.colors.length-1) {
							// allow horizontal movement
							var minV = ramp.colors[0].value+.03;
							var maxV = ramp.colors[ramp.colors.length-1].value-.03;
							var newV = Math.max(Math.min(maxV, m[0]), minV);
							ramp.colors[ramp.lControl.index].value = newV;
							ramp.lControl.circle.attr('cx', newV * RAMP_W);
							redraw = true;
						}

						if (redraw) {
							ramp.updateColormap();
							ramp.updateSVG();
						}

					})
					
					.on('mouseup.lControl', function() {
						ramp.lControl.circle.style('stroke-width', null);
						ramp.lControl = undefined;
						d3.select(document)
							.on('mousemove.lControl', null)
							.on('mouseup.lControl', null);
						//d3.event.stopPropagation();
					});
				d3.event.stopPropagation();
			})
	})(lControls, this)
}

ColorRamp.prototype.updateColormap = function() 
{
	this.colormap = new ColorMap(this.colors, 'lab');

	// render color ramp
	var colorScale = document.createElement('canvas');
	colorScale.width = RAMP_W; colorScale.height=RAMP_H;
	this.colormap.drawColorScale(RAMP_W, RAMP_H, Math.floor(RAMP_W/1), 'horizontal', colorScale);

	// update the color ramp image
	this.colorRampImage.attr('xlink:href', colorScale.toDataURL());

	// notify
	this.fireUpdate();
}

ColorRamp.prototype.removeColor = function(index) {
	if (this.colors.length == 2) {
		return;
	}
	else if (index !== null && index !== undefined)
	{
		this.colors.splice(index, 1);
		if (index == 0) {
			this.colors[0].value = 0;
		}
		else if (index == this.colors.length) {
			this.colors[index-1].value = 1;
		}
		this.updateColormap();
		this.updateSVG();

		if (this.selectedControlPoint === index) {
			this.unselectControlPoint();
		}
	}
	else
	{
		this.colors.pop();
		
		// move the last control point to the end of the ramp
		this.colors[ this.colors.length-1 ].value = 1;
		this.updateColormap();
		this.updateSVG();

		if (!isNaN(this.selectedControlPoint) && this.selectedControlPoint > this.colors.length-1) {
			this.unselectControlPoint();
		}
	}
}
ColorRamp.prototype.insertColor = function(newColor, value) 
{
	var labNewColor = null;
	if (newColor.r !== undefined && newColor.g !== undefined && newColor.b !== undefined) {
		labNewColor = d3.lab(d3.rgb(newColor.r, newColor.g, newColor.b));
	}
	else if (newColor.l !== undefined && newColor.a !== undefined && newColor.b !== undefined) {
		labNewColor = d3.lab(newColor.l, newColor.a, newColor.b);
	}

	// create a new entry
	var cPoint = {
		value: value,
		lab: [labNewColor.l, labNewColor.a, labNewColor.b] 
	}
	// if a value is given, insert the color in the right space
	if (value !== undefined && value !== null)
	{
		if (this.colors[0].value > value) 
		{
			this.colors.splice(0, 0, cPoint);
		}
		else if (this.colors[this.colors.length-1].value < value) 
		{
			this.colors.push(cPoint);
		}

		else
		{
			// find the correct place 
			for (var i=0; i<this.colors.length-1; i++) 
			{
				var c1 = this.colors[i];
				var c2 = this.colors[i+1];

				if (c1.value == value) {
					this.colors[i] = cPoint;
				}
				else if (c2.value == value) {
					this.colors[i+1] = cPoint;
				}
				else if (c1.value < value && c2.value > value) 
				{
					this.colors.splice(i+1, 0, cPoint);
					break;	
				}
			}
		}
	}
	else
	{
		// append to the end of the colormap, but rescale the rest of the colors
		cPoint.value = 1;
		this.colors.push(cPoint);
		var oldRange = d3.scaleLinear()
			.domain([0, this.colors.length-1])
			.range([ 0, 1 ]);

		for (var i=0; i<this.colors.length-1; i++) 
		{
			var c = this.colors[i];
			c.value = oldRange(i);
		}
	}

	this.updateColormap();
	this.updateSVG();
}

