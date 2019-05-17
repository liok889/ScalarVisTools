var STIM_W = 200;
var STIM_H = 200;

var KS_TEST_THRESHOLD = 0.10;
var KS_TRIALS = 10;
var KS_TRIAL_EXTENSION = 4;
var KS_ENABLE = false;

var MAGNITUDES = [2.0, 3, 4, 5.0]
var START_DIFF = 3.0;
var TRIAL_COUNT = 50;

var STEP = 0.5/1.75;

var BACKWARD = 2.5*STEP;
var FORWARD = STEP;

var visLeft, visRight;

function initExperimentGL(exp)
{
	var shaderList = [
		{name: 'vis',		path: 'design/src/shaders/vis.frag'},
		{name: 'vertex',	path: 'design/src/shaders/vertex.vert' }
	];
	
	function createVisLeft(callback) 
	{
		visLeft = new ColorAnalysis(
			exp.stimulus.getFirst(),
			d3.select("#stimLeft").node(),
			function() {callback(null);}, shaderList
		);
	}

	function createVisRight(callback) {
		visRight = new ColorAnalysis(
			exp.stimulus.getSecond(),
			d3.select("#stimRight").node(),
			function() {callback(null);}, shaderList
		);
	}

	var q = d3.queue()
		.defer( createVisLeft )
		.defer( createVisRight )
		.defer( loadExternalColorPresets )
		.awaitAll(function(error, results)
		{
			if (error) { 
				throw error;
			}
			else
			{
				// create vis pipelines
				exp.visLeft = visLeft;
				exp.visRight = visRight;

				exp.visLeft.createVisPipeline();
				exp.visRight.createVisPipeline();

				// initialize colormaps
				exp.colormapLeft = 	getColorPreset('greyscale', null, null, true);
				exp.colormapRight = getColorPreset('greyscale', null, null, true);
				
				exp.stimulus.getFirst().setColorMap(exp.colormapLeft);
				exp.stimulus.getSecond().setColorMap(exp.colormapRight);

				// render color map
				var scaleCanvas = d3.select("#colorScaleCanvas");
				exp.colormapLeft.drawColorScale(
					+scaleCanvas.attr('width'),
					+scaleCanvas.attr('height'), 100,
					'vertical',
					scaleCanvas.node()
				);

				// when ready, visualize the stimulus
				exp.next();
			}
		});
}

function shuffleArray(a) {
	var j, x, i;
	for (i = a.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		x = a[i];
		a[i] = a[j];
		a[j] = x;
	}
	return a;
}

function Experiment()
{
	// randomize order of magnitudes
	shuffleArray(MAGNITUDES);

	this.currentDiff = START_DIFF;
	this.currentMagnitude = MAGNITUDES[0];
	this.currentMagnitudeIndex = 0;
	this.currentTrial = 0;

	// stimulius object
	this.stimulus = new TAFC(STIM_W, STIM_H);
	this.stimulus.shuffleImagePosition();

	this.results = [];
	this.correctCount = 0;
	this.totalCount = 0;

	// show loading image
	d3.select("#loadingImage").style("visibility", 'visible')

	// hide confirm button
	d3.select("#confirmButton").node().disabled = true;

	// initialize GL elements
	initExperimentGL(this);
}

Experiment.prototype.randomStimulusThreaded = function() 
{
	(function(experiment, timeStart) 
	{
		var magnitude = experiment.currentMagnitude;
		var diff = experiment.currentDiff;
	
		// exponent weight set by default in noisegen.js (don't change)	
		// setExponentWeight(expWeight);

		experiment.stimulus.randomStimulusThreaded(
			magnitude,
			diff,
			KS_TEST_THRESHOLD,
			
			function(results) 
			{
				// visualize the 2AFC images
				experiment.visualize(results);	
			}
		);
	})(this, Date.now());

}

Experiment.prototype.visualize = function(results)
{
	this.visLeft.run('vis');
	this.visRight.run('vis');

	unselect();

	// hide loading image
	d3.select("#loadingImage")
		.style('visibility', 'hidden')

	// show confirm button
	d3.select('#confirmButton')
		.node().disabled = false;
		//.style('visibility', 'visible');

}

Experiment.prototype.next = function()
{
	// if worker is supported
	if (window.Worker) {
		this.randomStimulusThreaded();
	}
}

Experiment.prototype.answer = function(response)
{
	if ((response == 'right' && !this.stimulus.isSwaped()) ||
		(response == 'left' && this.stimulus.isSwaped()))
	{
		correct = true;
		this.correctCount++;
	}
	else
	{
		correct = false;
	}
	this.totalCount++;
	this.currentTrial++;
	

	if (this.currentTrial > TRIAL_COUNT)
	{
		console.log("experiment complete!")
	}
	else
	{
		if (correct) {
			this.currentDiff = Math.max(DIFF[0], this.currentDiff-FORWARD);
			console.log("CORRECT! difficulty: " + this.currentDiff)
		}
		else {
			this.currentDiff = Math.min(DIFF[1], this.currentDiff+BACKWARD);
			console.log("inCORRECT :( difficulty rolled back to: " + this.currentDiff)

		}

		// show loading image
		unselect();
		d3.select("#loadingImage").style("visibility", 'visible')

		// hide confirm button
		d3.select("#confirmButton")
			.node().disabled = true;
			//.style("visibility", 'hidden');

		// clear canvas
		this.visLeft.clearCanvas();
		this.visRight.clearCanvas();
		// move to next stimlus
		this.next();

	}
}
