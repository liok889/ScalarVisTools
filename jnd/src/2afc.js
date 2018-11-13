
var TRIALS0 = 5;
var TRIALS = 30;

var TOLERANCE = .07;

function TAFC(width, height)
{
	this.width = width;
	this.height = height;

	this.stim1 = new ScalarField(width, height);
	this.stim2 = new ScalarField(width, height);	
}

TAFC.prototype.randomStimulus = function(targetScale, diff)
{
	function sign(x) { if (x >= 0) return 1; else return -1; }

	var done = false;
	var minDiff = Number.MAX_VALUE;
	var maxDiff = Number.MIN_VALUE;
	
	var actualDiff;
	var tolerance = Math.abs(diff * TOLERANCE);
	var g1, g2;

	// TODO: randomize the position of the target
	var iterations = 0;
	for (var longIt=0; longIt<TRIALS0 && !done; longIt++)
	{
		seedNoise();
		setNoiseOffset(Math.random() * 10000, Math.random() * 10000);
		makeNoise(this.stim1, targetScale);

		g1 = calcAvgGradient(this.stim1);

		for (var shortIt=0; shortIt<TRIALS && !done; shortIt++, iterations++)
		{
			seedNoise();
			setNoiseOffset(Math.random() * 10000, Math.random() * 10000);

			var K_RANGE = [.1,.3];
			var k = Math.random() * (K_RANGE[1]-K_RANGE[0]) + K_RANGE[1];
			makeNoise(this.stim2, targetScale+diff*k)

			// compute difference between the two stimuli
			g2 = calcAvgGradient(this.stim2);

			actualDiff = g2-g1;

			minDiff = Math.min(actualDiff, minDiff);
			maxDiff = Math.max(actualDiff, maxDiff);

			var delta = actualDiff-diff
			if (Math.abs(delta) <= tolerance && sign(actualDiff) == sign(diff))
			{
				done = true;
			}
		}
	}

	if (done) 
	{
		console.log('base: ' + g1.toFixed(2) + ', actualDiff: ' + actualDiff.toFixed(3) + ", req: " + diff.toFixed(3) + ", converged: " + iterations);
		return true;
	
	}
	else
	{
		console.error("could not converge. min Diff rached: " + minDiff);
		return false;
	}
}

TAFC.prototype.getFirst = function() {
	return this.stim1;
};


TAFC.prototype.getSecond = function() {
	return this.stim2;
};

function calcAvgGradient(field)
{
	var stats = field.getSubregionStats(0, 0, field.w, field.h);
	return stats.steepness;
}

