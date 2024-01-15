// number of trials per block
var TRIAL_PER_BLOCK = 5;

// amount of time stimulus is visible before it's cleared
var EXPOSURE_TIME = 1000; // m. seconds
var FIXATION_TIME = [800, 1200];

// training session?
var TRAINING = false;

// initial difference set to 30% of full statistic range
var INITIAL_DIFFICULTY = .3;

// attentin is picked from 2.5% of extreme stimuli
var ATTN_CHECK_PERCENTILE = .025;

var DIFF_TOLERANCE = .01/4;

// STEP is 5% of full range
var DIFFICULTY_STEP = .075;

// attention checks
var ATTN_CHECK_PER_BLOCK=0;

// break between color blocks?
var BREAK_COLOR = true;

var PROMPTS = {
    mean: "Select the map that shows HIGHER terrain on average",
    std: "Select the map that shows MORE terrain variation on average",
    steepness: "Select the map that shows STEEPER terrain on average"
}
function permute(arr, count)
{
    if (!count) {
        count = 5000;
    }
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
        for (var i=0, len=arr.length; i<count; i++) {
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
    this.attentionScores = [];

    this.data = stimulusData.data;
    this.statistic = statistic;
    this.orderedList = stimulusData[ statistic + 'List'];
    this.statisticRange = [
        this.data[this.orderedList[0]][statistic],
        this.data[this.orderedList[this.data.length-1]][statistic]
    ];

    this.colormaps = colormaps;

    // split the statistic intensity into n splits
    if (!splits) {
        this.splits = 1;
        this.splitBinSize = this.data.length;
    } else {
        this.splits = splits;
        this.splitBinSize = Math.round(.5+this.data.length / splits);
    }

    // text prompt
    var prompt = PROMPTS[this.statistic];
    d3.select("#textPrompt").html(prompt);
    d3.select("#textPrompt2").html(prompt);

    // create two generators
    this.generatorLeft = new NoiseGenerator(null, d3.select("#canvasLeft").node());
    this.generatorRight = new NoiseGenerator(null, d3.select("#canvasRight").node());

    console.log("done");
    this.generatorLeft.generate(); this.generatorLeft.vis();
    this.generatorRight.generate(); this.generatorRight.vis();

    // set difficulty tolerance to 20x the mean of difficulty diff in data
    DIFF_TOLERANCE = 20 * this.calcDifficultyDiff();

    // scale step/attention difficulty by the statistic range
    DIFFICULTY_STEP *= this.statisticRange[1]-this.statisticRange[0];

    this.clearSelection();
    this.ready();
}

function highlight(side, _class, hideResponseText)
{
    d3.select("#canvasLeft").attr('class', 'stimulusCanvas');
    d3.select("#canvasRight").attr('class', 'stimulusCanvas');
    d3.select("#divRight").attr('class', null);
    d3.select("#divLeft").attr('class', null);

    d3.select("#textResponse").style('visibility', 'hidden');

    if (side) {
        d3.select("#div" + side).classed(_class || 'bgHighlight', true);
        d3.select('#canvas' + side).attr('class', 'selectedCanvas');
        if (!hideResponseText) {
            d3.select("#textResponse").style('visibility', null);
        }

    }
}


function flash(side)
{
    (function(_side) {
        highlight(_side, 'bgGrey');
        var TIMEOUT = 70;

        setTimeout(function() { highlight(); }, TIMEOUT);
        setTimeout(function() { highlight(_side, 'bgGrey', true)}, TIMEOUT*2);
        setTimeout(function() { highlight(); }, TIMEOUT*3);
        setTimeout(function() { highlight(_side, 'bgGrey', true)}, TIMEOUT*4);
        setTimeout(function() { highlight(); }, TIMEOUT*5);
        setTimeout(function() { highlight(_side, 'bgGrey', true)}, TIMEOUT*6);
        setTimeout(function() { highlight(); }, TIMEOUT*7);
    })(side)
}



Experiment.prototype.clearSelection = function()
{
    // arm events
    highlight();

    d3.select("#canvasLeft").on('mousedown', function()
    {
        highlight('Left');
    })

    d3.select("#canvasRight").on('mousedown', function()
    {
        highlight('Right');
    });

    (function(_exp, _side)
    {
        d3.select(document).on('keydown', function()
        {
            if (d3.event.keyCode == 32 || d3.event.keyCode == 13)
            {
                if (_exp.getAnsweredCanvas()) {
                    _exp.enterResponse();
                }
            }
        });
    })(this);
}

Experiment.prototype.enterResponse = function()
{
    if (TRAINING) {
        if (!this.isCorrect()) {
            flash(exp.correct == 'left' ? 'Left' : 'Right');
            return;
        }
    }

    // store the result
    this.storeTrialData();

    if (!this.isAttentionCheck())
    {
        if (this.isCorrect())
        {
            // make the next trial harder
            if (this.difficulty > DIFFICULTY_STEP) {
                this.difficulty -= DIFFICULTY_STEP;
            }
            else {
                var step = DIFFICULTY_STEP/1.5;
                var iters = 0;
                while (this.difficulty < step && (iters++<50)) {
                    step /= 1.5;
                }
                this.difficulty -= step;
            }
        } else {
            // make the next trial easier
            this.difficulty += DIFFICULTY_STEP*3;
            //console.log("incorrect");
        }
    }
    console.log("difficulty: " + this.difficulty);

    if (this.nextTrial()) {
        console.log("END!");
        this.endExperiment();
    }
}


Experiment.prototype.ready = function()
{
    var splitSeq = permute(d3.range(this.splits));
    var colormapSeq = permute(this.colormaps || ['greyscale']);
    var blockSeq = [];

    for (var i=0; i<colormapSeq.length; i++)
    {
        var colormap = colormapSeq[i];
        for (var j=0; j<splitSeq.length; j++)
        {
            // which split?
            var split = splitSeq[j];

            // make a trial sequence and randomly put attention checks
            var trialSeq = [];
            for (var t=0; t<TRIAL_PER_BLOCK; t++) {
                trialSeq.push('T');
            }
            for (var check=0; check<ATTN_CHECK_PER_BLOCK; check++) {
                var position = Math.floor(Math.random()*trialSeq.length);
                trialSeq.splice(position, 0, 'C');
            }

            blockSeq.push({
                colormap: colormap,
                split: split,
                trialSeq: trialSeq
            });
        }
    }
    this.blocks = blockSeq;
    this.currentBlock = -1;
    this.trialsRemaining = -1;
    this.nextTrial();
}

Experiment.prototype.calcDifficultyDiff = function()
{
    var mean = 0;
    for (var i=0; i<this.orderedList.length-1; i++) {
        var i0 = this.orderedList[i];
        var i1 = this.orderedList[i+1];

        var d0 = this.data[i0][this.statistic];
        var d1 = this.data[i1][this.statistic];
        mean += d1-d0
    }
    return mean / (this.orderedList.length-1);
}

Experiment.prototype.nextBlock = function()
{
    this.currentBlock++;
    if (this.currentBlock >= this.blocks.length) {
        return true;
    }

    // set initial delta (i.e., difficulty)
    this.difficulty = INITIAL_DIFFICULTY * (this.statisticRange[1]-this.statisticRange[0]);
    this.trialsRemaining = TRIAL_PER_BLOCK + ATTN_CHECK_PER_BLOCK;

    // analyzed trials
    this.currentTrial = 0;

    // all sequence, including attention checks
    this.currentStimulus = 0;

    // get current config
    var config = this.blocks[this.currentBlock];
    if (config.colormap != this.colormap)
    {
        this.changeColormap(config.colormap);
        this.colormap = config.colormap;
    }
    var splitIndex = config.split * this.splitBinSize;
    this.stimulusList = this.orderedList.slice(splitIndex, splitIndex+this.splitBinSize);

    return false;
}

Experiment.prototype.pickCheck = function()
{
    var range1 =
        [0, Math.ceil(this.orderedList.length*ATTN_CHECK_PERCENTILE)+1];
    var range2 =
        [this.orderedList.length-Math.ceil(this.orderedList.length*ATTN_CHECK_PERCENTILE), this.orderedList.length];

    var i1 = Math.floor(Math.random() * (range1[1]-range1[0])) + range1[0];
    var i2 = Math.floor(Math.random() * (range2[1]-range2[0])) + range2[0];

    this.target = this.orderedList[i2];
    this.reference = this.orderedList[i1];

    if (Math.random() < .5)
    {
        this.left = this.target;
        this.right = this.reference;
        this.correct = 'left';
    } else
    {
        this.right = this.target;
        this.left = this.reference;
        this.correct = 'right';
    }

}
Experiment.prototype.pickStimulus = function()
{
    var difficulty = this.difficulty;

    // use full available stimulus range, but restrict one stimulus to be within
    // the base range defined by the current group split
    var stimulusList = this.orderedList;
    var splitStart = this.blocks[this.currentBlock].split * this.splitBinSize;
    var splitEnd = Math.min(stimulusList.length, splitStart+this.splitBinSize);
    var stimulusRange = [splitStart, splitEnd];

    // or
    //stimulusRange = [0, stimulusList.length]

    // number of stimulus generation tries before giving up
    var TRIES = 500;

    // pick a random stimulus and approach
    var converged = false;
    var bestS1, bestS2;
    var lastDiff = undefined;
    var bestDiff = Number.MAX_VALUE;
    for (var iter=0; iter<TRIES && !converged; iter++)
    {
        var approach = Math.random() < .5 ? -1 : 1;
        //var stimulus1 = Math.floor(Math.random() * this.stimulusList.length);
        var stimulus1 = Math.floor(Math.random() * (stimulusRange[1]-stimulusRange[0])) + stimulusRange[0];
        var d1 = this.data[stimulus1][this.statistic];

        for (
            var stimulus2 = stimulus1 + approach;
            stimulus2 >= 0 && stimulus2 < stimulusList.length;
            stimulus2 += approach
        )
        {
            var d2 = this.data[stimulus2][this.statistic];
            var statDiff = Math.abs(d1-d2);
            var difficultyDiff = Math.abs(statDiff-difficulty)
            if ( difficultyDiff <= DIFF_TOLERANCE)
            {
                converged = true;
                //bestS1 = stimulus1;
                //bestS2 = stimulus2;
                //break;
            }

            if (lastDiff !== undefined && difficultyDiff > lastDiff)
            {
                // starting to exceed difference, stop searching
                break;
            }
            lastDiff = difficultyDiff;

            if (bestDiff > difficultyDiff)
            {
                bestDiff = difficultyDiff;
                bestS1 = stimulus1;
                bestS2 = stimulus2;
            }
        }
    }

    // radomly decide which one is the target
    var stat1 = this.data[bestS1][this.statistic];
    var stat2 = this.data[bestS2][this.statistic];
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
    } else if (right.classed('selectedCanvas')) {
        return 'right';
    }
    else {
        null
    }
}
Experiment.prototype.isCorrect = function()
{
    var answer = this.getAnsweredCanvas();
    if (answer == this.correct) {
        return true;
    }
    else {
        return false;
    }
}
Experiment.prototype.isAttentionCheck = function()
{
    var blockInfo = this.blocks[this.currentBlock];
    if (blockInfo.trialSeq[this.currentStimulus]=='C')
    {
        // attention check
        return true;
    }
    else {
        return false;
    }
}


Experiment.prototype.storeTrialData = function()
{
    if (this.isAttentionCheck())
    {
        // attention check
        this.attentionScores.push(this.isCorrect() ? 1 : 0);
    }
    else {
        var blockInfo = this.blocks[this.currentBlock];
        this.results.push({
            responseTime: Date.now()-this.readyTime,
            difficulty: this.difficulty,
            actualDifficulty: this.actualDifficulty,
            targetLocation: this.correct,
            answeredLocation: this.getAnsweredCanvas(),
            correct: this.isCorrect() ? 1 : 0,
            converged: this.converged ? 1 : 0,
            statistic: this.statistic,

            split: blockInfo.split,
            colormap: blockInfo.colormap,

            trialNumber: this.currentTrial+1,
            blockNumber: this.currentBlock+1

        });
    }
}

Experiment.prototype.renderStimulus = function()
{
    if (this.fixationTimeout) {
        clearTimeout(this.fixationTimeout);
        this.fixationTimeout = undefined;
    }

    if (this.exposureTimeout) {
        clearTimeout(this.exposureTimeout);
        this.exposureTimeout = undefined;
    }
    this.clearSelection();
    (function(obj) {

        if (FIXATION_TIME) {
            // hide all elements except the crosshair
            d3.select("#textPrompt").style('visibility', 'hidden');
            d3.select("#divScale").style('visibility', 'hidden');
            d3.select("#canvasLeft").style('visibility', 'hidden');
            d3.select("#canvasRight").style('visibility', 'hidden');

            d3.select('body').classed('nocursor', true);
        }
        var fixationTime = FIXATION_TIME ? Math.round(.5+Math.random()*(FIXATION_TIME[1]-FIXATION_TIME[0]))+FIXATION_TIME[0] : 0
        if (obj.currentBlock==0 && obj.currentTrial==0) {
            fixationTime = Math.floor(fixationTime*1.5);
        }
        obj.fixationTimeout = setTimeout(function()
        {
            obj.fixationTimeout = undefined;

            var leftStimulus = obj.data[obj.left];
            var rightStimulus = obj.data[obj.right];

            obj.generatorLeft.generate(
                leftStimulus.seed,
                leftStimulus.offset,
                leftStimulus.scale,
                leftStimulus.exponent
            );
            obj.generatorRight.generate(
                rightStimulus.seed,
                rightStimulus.offset,
                rightStimulus.scale,
                rightStimulus.exponent
            );

            obj.generatorLeft.vis();
            obj.generatorRight.vis();

            // reveal canvas
            d3.select("#canvasLeft").style('visibility', null);
            d3.select("#canvasRight").style('visibility', null);
            d3.select('body').classed('nocursor', false);

            if (EXPOSURE_TIME) {
                d3.select("#textPrompt").style('visibility', 'hidden');
                d3.select("#divScale").style('visibility', 'hidden');
            } else {
                d3.select("#textPrompt").style('visibility', null);
                d3.select("#divScale").style('visibility', null);
            }
            obj.readyTime = Date.now();

            obj.exposureTime = EXPOSURE_TIME;
            if (EXPOSURE_TIME > 0)
            {
                obj.exposureTimeout = setTimeout(function()
                {
                    obj.exposureTime = undefined;
                    var canvasLeft = d3.select("#canvasLeft").node();
                    var canvasRight = d3.select("#canvasRight").node();

                    var glLeft = d3.select("#canvasLeft").node().getContext('webgl');
                    var glRight = d3.select("#canvasRight").node().getContext('webgl');


                    glLeft.clearColor(1, 1, 1, 1);
                    glRight.clearColor(1, 1, 1, 1);

                    glLeft.clear(glLeft.COLOR_BUFFER_BIT);
                    glRight.clear(glRight.COLOR_BUFFER_BIT);

                    d3.select("#textPrompt").style('visibility', null);
                    d3.select("#divScale").style('visibility', null);
                    d3.select('body').classed('nocursor', false);


                }, EXPOSURE_TIME);
            }
        }, fixationTime);

    })(this);
}

Experiment.prototype.endExperiment = function()
{
    this.clearSelection();
    d3.selectAll("canvas").style('visibility', 'hidden');

}

Experiment.prototype.estimatePercent = function()
{
    var trials = (TRIAL_PER_BLOCK+ATTN_CHECK_PER_BLOCK)
    var total = trials*this.blocks.length;
    var complete = this.currentBlock*trials + this.currentStimulus;

    var percent = Math.min(100,Math.round(.5 + (complete/total)*100));
    return percent;
}

Experiment.prototype.nextTrial = function(dontCount)
{
    this.clearSelection();
    if (!dontCount) {
        this.trialsRemaining--;
    }

    if (this.trialsRemaining <= 0) {
        var done = this.nextBlock();
        if (done) {
            return true;
        }
        else if (this.colorChanged && BREAK_COLOR)
        {

            this.colorChanged = false;

            (function(expObj) {
                d3.select("#textPercent")
                    .style('visibility', expObj.currentBlock==0 ? 'hidden' : 'visible')
                d3.select("#textPercentComplete")
                    .html(expObj.estimatePercent() + '%')

                showModal(function()
                {
                    console.log('model callback')
                    expObj.nextTrial(true);
                });
            })(this);
            return false;
        }
    }
    else {
        if (this.isAttentionCheck())
        {
            //console.log("that was attention check");
        }
        else {
            if (!dontCount) {
                this.currentTrial++;
            }
        }
        if (!dontCount) {
            this.currentStimulus++;
        }


    }

    // select next stimulus
    if (this.isAttentionCheck())
    {
        //console.log('ENGAGEMENT');
        this.pickCheck();
    }
    else {
        this.pickStimulus();
    }

    // render stimulus
    this.renderStimulus();

    // store time
    this.readyTime = Date.now();
}

Experiment.prototype.changeColormap = function(preset)
{
    changeColormap(preset);
    this.colorChanged = true;
}

function changeColormap(preset)
{
    var cmap = getColorPreset(preset);
    var scaleCanvas = d3.select("#canvasScale").node();
    cmap.drawColorScale(+scaleCanvas.width, +scaleCanvas.height, +scaleCanvas.height, 'vertical', scaleCanvas);

    var scaleCanvas2 = d3.select("#canvasScale2").node();
    cmap.drawColorScale(+scaleCanvas2.width, +scaleCanvas2.height, +scaleCanvas2.width, 'horizontal', scaleCanvas2);

    ScalarVis.setUniversalColormap(cmap);

}
