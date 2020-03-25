function LineupExperiment(w, h, _lineupN, gMain, gDecoy, nullOption)
{
    // width / height of the model
    this.w = w;
    this.h = h;

    // whether to randomly perturb decoy (subjec to perturbation parameters)
    this.perturb = true;

    this.main = new GaussMixBivariate(w, h, gMain);
    this.decoy = new GaussMixBivariate(w, h, gDecoy);

    this.randomModel();

    // lineup
    this.lineupN = _lineupN;
    this.lineup = new Lineup(w, h, _lineupN, this.main, this.decoy, nullOption);

    this.canMakeSelection = false;
    this.nullOption = nullOption;
}

LineupExperiment.prototype.enableSelection = function(t) {
    this.canMakeSelection = t;
}
LineupExperiment.prototype.getMain = function() {
    return this.main;
}

LineupExperiment.prototype.getDecoy = function() {
    return this.decoy;
}

LineupExperiment.prototype.copyToDecoy = function()
{
    this.main.copyTo(this.decoy);
    if (this.perturb)
    {
        this.decoy.randomPerturb();
    }
    this.decoy.fireCallbacks();
}

LineupExperiment.prototype.setClickFeedback = function(correct, incorrect)
{
    this.correct = correct;
    this.incorrect = incorrect;
}

LineupExperiment.prototype.randomModel = function()
{
    this.curDistance = null;
    this.main.init();
    this.copyToDecoy();
}

LineupExperiment.prototype.modelDecoyDistance = function()
{
    this.curDistance = this.main.pdfDistance(this.decoy);
    return this.curDistance;
}

LineupExperiment.prototype.getAnswer = function() {
    return this.answer;
}

LineupExperiment.prototype.highlightCorrect = function(show)
{
    this.domSelection.selectAll('td').style('background-color', null);
    d3.select('div.nullOption').style('border', 'solid 1px black');

    var td = d3.select('#sample' + (this.lineupN-1)).node().parentNode;
    if (this.trialHasDecoy) {

        d3.select(td)
            .style('background-color', show ? '#aaaaaa' : null);
    }
    else
    {
        d3.select('div.nullOption')
            .style('border', show ? 'solid 10px #aaaaaa' : 'solid 1px black');
    }
    // 00cc66
}
LineupExperiment.prototype.randomLineup = function(fidelity, domSelection, noDecoy)
{
    var SEL_BORDER = "#ff623b"//"solid 4px #fcbd00";

    // new lineup
    this.trialHasDecoy = noDecoy ? false : true;
    this.lineup.sample(fidelity, noDecoy);
    this.lineup.layoutCanvases(domSelection);
    this.domSelection = domSelection;

    // clear out old selection / answer
    this.answer = null;
    domSelection.selectAll('td').style('background-color', null);

    // setup callbacks
    (function(lineup, dom, noDecoy)
    {
        dom.selectAll('canvas').on('click', function()
        {
            if (lineup.incorrect) lineup.incorrect();
            if (lineup.canMakeSelection)
            {
                //dom.style('border', null);
                dom.selectAll('td').style('background-color', null);
                dom.selectAll('div.nullOption').style('border', 'solid 1px black');
                d3.select(this.parentNode).style('background-color', SEL_BORDER);
            }
            lineup.answer = "0";
            lineup.canvasIndex = d3.select(this).attr('class').substr(5);
        });
        
        dom.selectAll('div.nullOption').on('click', function()
        {
            if (noDecoy && lineup.correct) lineup.correct();
            else if (!noDecoy && lineup.incorrect) lineup.incorrect();

            lineup.answer = noDecoy ? '1' : '0';
            d3.select(this).style('border', 'solid 10px ' + SEL_BORDER)
            dom.selectAll('td').style('background-color', null);
            lineup.canvasIndex = '98';
        });

    })(this, domSelection, noDecoy);


    (function(lineup, dom, noDecoy)
    {
        d3.select('#sample' + (lineup.lineupN-1)).on('click', function()
        {
            if (lineup.correct) lineup.correct();
            if (lineup.canMakeSelection)
            {
                dom.selectAll('td').style('background-color', null);
                dom.selectAll('div.nullOption').style('border', 'solid 1px black');
                d3.select(this.parentNode).style('background-color', SEL_BORDER);
            }
            lineup.answer = noDecoy ? '0' : '1';
            lineup.canvasIndex = d3.select(this).attr('class').substr(5);
        })
    })(this, domSelection, noDecoy);
}

// generates a lineup with an expected distance between the main and the decoy
// ideally, set tolerance level to STD (from simulations)
var LINEUP_TOLERANCE = 0.01;
var LINEUP_MAX_TRIAL = 60;
var LINEUP_MAX_ROUNDS = 3;

LineupExperiment.prototype.modelWithExpectation = function(expectation)
{
    var range = expectation && typeof(expectation) == 'object';

    var tolerance = LINEUP_TOLERANCE;
    var converged = false;
    var distance = null;
    var iterations = 0;
    
    this.answer = null;
  
    for (var round=0; !converged && round<LINEUP_MAX_ROUNDS; round++)
    {
        for (var trial=0; !converged && trial<LINEUP_MAX_TRIAL; trial++, iterations++)
        {
            this.randomModel();
            distance = this.modelDecoyDistance();

            if (!expectation) 
            {
                console.log("no expectaiton. Converged");
                converged = true;
            }
            else
            {
                if (range && distance >= expectation[0] && distance <= expectation[1]) 
                {
                    converged = true;
                }
                if (Math.abs(distance-expectation) <= tolerance) 
                {
                    converged = true;
                }
            }
        }

        if (!converged) 
        {
            tolerance *= 2;
        }
    }


    //console.log("[" + iterations + "]: requested: " + expectation + ", got: " + distance);
    this.curDistance = distance;
    this.curExpectation = expectation;
    this.converged = converged;
    this.iterations = iterations;

    return distance;
}

LineupExperiment.prototype.getCurDistance = function() {
    return this.curDistance;
}

LineupExperiment.prototype.getCurExpectation = function() {
    return this.curExpectation;
}
