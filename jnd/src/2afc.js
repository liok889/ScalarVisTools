var TRIALS = 50;
var TOLERANCE = .1;

function TAFC(width, height)
{
	this.width = width;
	this.height = height;

	this.stim1 = new ScalarField(width, height);
	this.stim2 = new ScalarField(width, height);	
}

TAFC.prototype.randomStimulus = function(targetScale, diff)
{

	var done = false;
	var minDiff = Number.MAX_VALUE;
	var maxDiff = Number.MIN_VALUE;

	seedNoise();
	makeNoise(this.stim1, targetScale);

	var iterations;
	for (iterations=0; iterations<TRIALS && !done; iterations++)
	{
		seedNoise();
		makeNoise(this.stim2, targetScale+diff)

		// compute difference between the two stimuli
		var g1 = calcGradient(this.stim1);
		var g2 = calcGradient(this.stim2);

		var actualDiff = g2-g1;
		var tolerance = Math.abs(diff/TOLERANCE);

		minDiff = Math.min(actualDiff, minDiff);
		maxDiff = Math.max(actualDiff, maxDiff);

		if (actualDiff >= diff-tolerance && actualDiff <= diff+tolerance)
		{
			done = true;
			console.log("gradient actual diff: " + actualDiff + ", requested: " + diff + ", iterations: " + iterations);
		}
	}

	if (done) 
	{
		return true;
	}
	else
	{
		console.log("could not converge. min/max diff rached: " + minDiff + ', ' + maxDiff);
		return false;
	}
}

TAFC.prototype.getFirst = function() {
	return this.stim1;
};


TAFC.prototype.getSecond = function() {
	return this.stim2;
};

function calcGradient(field)
{
	var stats = field.getSubregionStats(0, 0, field.w, field.h);
	return stats.steepness;
}

