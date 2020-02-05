function LineupExperiment(w, h, _lineupN, gMain, gDecoy)
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
    this.lineup = new Lineup(w, h, _lineupN, this.main, this.decoy);

    this.canMakeSelection = false;
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
    this.main.init();
    this.copyToDecoy();
}

LineupExperiment.prototype.modelDecoyDistance = function()
{
    return this.main.pdfDistance(this.decoy);
}

LineupExperiment.prototype.randomLineup = function(fidelity, domSelection)
{
    var SEL_BORDER = "#ff623b"//"solid 4px #fcbd00";

    // new lineup
    this.lineup.sample(fidelity);
    this.lineup.layoutCanvases(domSelection);

    // clear out old selection / answer
    this.answer = null;
    domSelection.selectAll('td').style('background-color', null);

    // setup callbacks
    (function(lineup, dom)
    {
        dom.selectAll('canvas').on('click', function()
        {
            if (lineup.incorrect) lineup.incorrect();
            if (lineup.canMakeSelection)
            {
                //dom.style('border', null);
                dom.selectAll('td').style('background-color', null);
                d3.select(this.parentNode).style('background-color', SEL_BORDER);
            }
            lineup.answer = "0";
        });
    })(this, domSelection);


    (function(lineup, dom, lineupN)
    {
        d3.select('#sample' + (lineup.lineupN-1)).on('click', function()
        {
            if (lineup.correct) lineup.correct();
            if (lineup.canMakeSelection)
            {
                dom.selectAll('td').style('background-color', null);
                d3.select(this.parentNode).style('background-color', SEL_BORDER);
            }
            lineup.answer = "1";
        })
    })(this, domSelection);
}

// generates a lineup with an expected distance between the main and the decoy
// ideally, set tolerance level to STD (from simulations)
var LINEUP_TOLERANCE = 0.02;
var LINEUP_MAX_TRIAL=100;

LineupExperiment.prototype.modelWithExpectation = function(expectation)
{
    var trial = 0, distance = null;
    do
    {
        this.randomModel();
        distance = this.modelDecoyDistance();

        if (!expectation || ++trial > LINEUP_MAX_TRIAL) {
            break;
        }
        else
        {
            var dToE = Math.abs(distance-expectation);
            if (dToE < LINEUP_TOLERANCE) { break; }
        }

    } while (true);

    console.log("[" + trial + "]: requested: " + expectation + ", got: " + distance);
    this.curDistance = distance;
    return distance;
}
