var MAX_TRIAL=100;

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
    //this.randomLineup();
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

LineupExperiment.prototype.computeDistance = function()
{
    return this.main.pdfDistance(this.decoy);
}

LineupExperiment.prototype.randomLineup = function(fidelity, domSelection)
{
    // new lineup
    this.lineup.sample(fidelity);
    this.lineup.layoutCanvases(domSelection);


    // setup callbacks
    if (this.incorrect)
    {
        (function(callInCorrect, dom) {
            domSelection.selectAll('canvas').on('click', function() { callInCorrect(); })
        })(this.incorrect, domSelection);
    }

    if (this.correct)
    {
        (function(callCorrect, dom, lineupN) {
            domSelection.select('#sample' + (lineupN-1)).on('click', function() { callCorrect(); })
        })(this.correct, domSelection, this.lineupN);
    }

}
