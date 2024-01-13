
// number of trials per block
var TRIAL_PER_BLOCK = 20;

// amount of time stimulus is visible before it's cleared
var EXPOSURE_TIME = 1000; // m. seconds

function permuate(arr, count)
{
    if (arr.length == 1) {
        return arr;
    }
    else if (arr.length == 2) {
        if (Math.random()<.5) {
            var temp = arr[1]; arr[1]=arr[0]; arr[0]=temp;
            return arr;
        }
        else {
            return arr;
        }
    }
    else {
        for (var i=0, len=arr.length, iters = count || 10000; i<count; i++) {
            var i1 = Math.floor(Math.random() * len);
            var i2 = Math.floor(Math.random() * len);
            if (i1!=i2) {
                var temp = arr[i1];
                arr[i1] = arr[i2];
                arr[i2] = temp;
            }
        }
        return arr;
    }
}

function Experiment(stimulusData, statistic, splits, colormaps)
{
    this.results = [];

    this.data = stimulusData;
    this.statistic = statistic;
    this.orderedList = this.data[ statistic + 'List'];
    this.statisticRange = [
        this.data[this.orderedList[0]][statistic],
        this.data[this.orderedList[this.data.length]][statistic]
    ];
    this.rangeLen = this.statisticRange[1]-this.statisticRange[0];

    this.colormaps = colormaps;

    // split the statistic intensity into n splits
    if (!splits) {
        this.splits = 1;
        this.splitBinSize = this.data.length;
    } else {
        this.splits = splits;
        this.splitBinSize = Math.round(.5+this.data.length / splits);
    }

    // create two generators
    this.generatorLeft = new NoiseGenerator(null, d3.select("#canvasLeft").node());
    this.generatorRight = new NoiseGenerator(null, d3.select("#canvasRight").node());
}

// initial difference between 2 options set to 20% of full range
var INITIAL_DIFFICULTY = .2;
var DIFF_TOLERANCE = .01/2;

// STEP is 8% of full range
var STEP = .08;

Experiment.prototype.ready = function()
{
    var splitSeq = permute(d3.range(this.splits));
    var colormapSeq = this.colormaps || ['greyscale'];
    var blockSeq = [];

    for (var i=0; i<colormapSeq.length; i++)
    {
        var colormap = colormapSeq[i];
        for (var j=0; j<splitSeq.length; j++)
        {
            var split = splitSeq[j];
            blockSeq.push({
                colormap: colormap,
                split: split
            });
        }
    }
    this.blocks = blockSeq;
    this.currentBlock = -1;
    this.trialsRemaining = -1;
    this.nextTrial();
}

Experiment.prototype.nextBlock = function()
{
    this.currentBlock++;
    if (this.currentBlock >= this.blocks.length) {
        return true;
    }

    // set initial delta (i.e., difficulty)
    this.difficulty = INITIAL_DIFFICULTY * this.rangeLen;
    this.tolerance = DIFF_TOLERANCE * this.rangeLen
    this.trialsRemaining = TRIAL_PER_BLOCK;
    this.trialNumber = 0;

    // get current config
    var config = this.blocks[this.currentBlock];
    if (config.colormap != this.colormap)
    {
        ScalarVis.setUniversalColormap(config.colormap);
        this.colormap = config.colormap;

    }
    var splitIndex = config.split * this.splitBinSize;
    this.stimulusList = this.orderedList.slice(splitIndex, splitIndex+this.splitBinSize);

    return false;
}

Experiment.prototype.pickStimulus = function()
{
    // number of stimulus generation tries before giving up
    var TRIES = 500;

    // pick a random stimulus and approach
    var converged = false;
    var bestS1, bestS2;
    var lastDiff = undefined;
    var bestDiff = undefined;
    for (var iter=0; iter<TRIES && !converged; iter++)
    {
        var approach = Math.random() < .5 ? -1 : 1;
        var stimulus1 = Math.floor(Math.random() * this.stimulusList.length);
        var stimulus2 = stimulus1;
        for (
            var stimulus2 = stimulus1 + approach;
            stimulus2 >= 0 && stimulus2 < this.stimulusList.length;
            stimulus2 += approach
        )
        {
            var d1 = this.data[stimulus1][this.statistic];
            var d2 = this.data[stimulus2][this.statistic];

            var statDiff = Math.abs(d1-d2);
            var difficultyDiff = Math.abs(statDiff-this.difficulty)
            if ( difficultyDiff <= DIFF_TOLERANCE)
            {
                converged = true;
                bestS1 = stimulus1;
                bestS2 = stimulus2;
                break;
            }
            else if (lastDiff !== undefined && difficultyDiff > lastDiff)
            {
                // wrong direction, difference is increasing again
                break;
            }
            lastDiff = difficultyDiff;

            if (bestDiff === undefined || bestDiff > (difficultyDiff-DIFF_TOLERANCE))
            {
                bestDiff = difficultyDiff;
                bestS1 = stimulus1;
                bestS2 = stimulus2;
            }
        }
    }

    // radomly decide which one is the target
    var stat1 = this.data[bestS1][statistic];
    var stat2 = this.data[bestS2][statistic];
    if (stat1 > stat2) {
        this.target = bestS1;
        this.reference = bestS2;
    }
    else {
        this.target = bestS2;
        this.reference = bestS1;
    }
    this.actualDifficulty = Math.abs(stat1-stat2);

    if (Math.random() < .5) {
        this.left = this.target;
        this.right = this.reference;
        this.correct = 'left';
    } else {
        this.right = this.target;
        this.left = this.reference;
        this.correct = 'right';
    }
    this.converged = converged;
}

Experiment.prototype.getAnsweredCanvas = function()
{
    var left = d3.select('#canvasLeft');
    var right = d3.select("#canvasRight");
    if (left.classed('selectedCanvas')) {
        return 'left';
    } else {
        return 'right';
    }
}
Experiment.prototype.storeTrialData = function()
{
    var blockInfo = this.blocks[this.currentBlock];

    results.push({
        responseTime: Date.now()-this.readyTime,
        difficulty: this.difficulty,
        actualDifficulty: this.actualDifficulty,
        targetLocation: this.correct,
        answeredLocation: this.getAnsweredCanvas(),
        correct: this.getAnsweredCanvas() == this.correct ? 1 : 0,
        statistic: this.statistic,

        split: blockInfo.split,
        colormap: blockInfo.colormap,

        trialNumber: this.currentTrial+1,
        blockNumber: this.currentBlock+1

    });
}

Experiment.prototype.renderStimulus = function()
{
    var left = new SimInstance(this.generatorLeft, this.left);
    var right = new SimInstance(thus.generatorRight, this.right);

    left.render(true);
    right.render(true);

}
Experiment.prototype.nextTrial = function()
{
    this.trialsRemaining--;

    if (this.trialsRemaining < 0) {
        var done = this.nextBlock();
        if (done) {
            return true;
        }
    }
    else {
        this.currentTrial++;
    }

    // render stimulus
    this.renderStimulus();

    // store time
    this.readyTime = Date.now();

}
