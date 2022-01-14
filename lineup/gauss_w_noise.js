function GaussMixWithNoise(w, h, svg)
{
    GaussMixBivariate.call(this, w, h, svg);
}

// chain
GaussMixWithNoise.prototype = new GaussMixBivariate();
GaussMixWithNoise.prototype.constructor = GaussMixBivariate;

GaussMixWithNoise.prototype.addCluster = function(dontUpdate)
{
    // padding as 7% of width/height
    var padX = this.w * .07;
    var padY = this.h * .07;

    // cluster width / height as 15%
    var clusterSize = Math.min(this.w, this.h) * .4;
    var minClusterDist = clusterSize * .9

    var W = this.w - padX*2;
    var H = this.h - padY*2;
    console.log("add cluster: " + W + ', ' + H)

    var generated = true, x, y;
    do
    {
        // generate cluster centroid
        x = Math.random() * W + padX;
        y = Math.random() * H + padY;

        // scan list of clusters and make sure we're not too close
        // to an existing cluster
        for (var i=0; i<this.clusters.length; i++)
        {
            var c = this.clusters[i];
            var d = Math.sqrt(Math.pow(c.x-x, 2) + Math.pow(c.y-y, 2));
            if (d < minClusterDist) {
                // too close
                generated = false;
                continue;
            }
            else {
                generated = true;
            }
        }
    } while(!generated)

    if (!generated)
    {
        return null;
    }

    var cluster = {
        x: x,
        y: y,
        members: [],
        negative: false
    };

    // is this a positive or a "negative" clusters
    if (Math.random() < .5) {
        cluster.negative = true;
    }

    // how many gaussians?
    var MIN_GAUSS = 3, MAX_GAUSS = 4;
    var gaussCount = MIN_GAUSS + Math.floor(.5 + Math.random() * (MAX_GAUSS-MIN_GAUSS));
    for (var g=0; g<gaussCount; g++)
    {
        // gauss center: perturb up to 50% of clusterSize around cluster center
        var mx = cluster.x + (Math.random()*2-1) * .2 * clusterSize;
        var my = cluster.y + (Math.random()*2-1) * .2 * clusterSize;

        // standard deviation
        var MIN_SIGMA = .5 * clusterSize * .5;
        var MAX_SIGMA = .5 * clusterSize * 1.5;

        var sigmaX = Math.random()*(MAX_SIGMA-MIN_SIGMA) + MIN_SIGMA;
        var sigmaY = Math.random()*(MAX_SIGMA-MIN_SIGMA) + MIN_SIGMA;

        // correlation (limit to -0.3 to 0.3)
        var rho = (Math.random()*2-1) *.5;

        var scaler = cluster.negative ? -1 : 1;
        var gauss = new biGauss(mx, my, sigmaX, sigmaY, rho, scaler);
        this.models.push(gauss);
        cluster.members.push(gauss);
    }

    if (!dontUpdate) {
        this.updateModel();
    }

    return cluster;

}

GaussMixWithNoise.prototype.init = function()
{
    var MIN_CLUSTER = 4;
    var MAX_CLUSTER = 8;

    this.clusters = [];
    this.models = [];

    // figure out how many clusters we need
    var dontUpdate = true;
    var clusterCount = Math.floor(.5 + Math.random() * (MAX_CLUSTER-MIN_CLUSTER)) + MIN_CLUSTER;
    for (var i=0; i<clusterCount; i++)
    {
        var cluster = this.addCluster(dontUpdate);
        this.clusters.push(cluster);
    }
    this.models.sort(function(a,b) { return a.scaler-b.scaler });

    this.updateModel();
}

GaussMixWithNoise.prototype.copyTo = function(newModel, dontUpdate)
{
    if (!newModel) {
        newModel = new GaussMixWithNoise(this.w, this.h, null);
    }
    else {
        newModel.w = this.w;
        newModel.h = this.h;
    }
    return GaussMixBivariate.prototype.copyTo.call(this, newModel, dontUpdate);

    /*
    newModel.models = [];
    newModel.isCopy = "yes, a copy";
    for (var i=0; i<this.models.length; i++)
    {
        var m = this.models[i];
        newModel.models.push(
            new biGauss(m.mX, m.mY, m.sX, m.sY, m.rho, m.scaler)
        );
    }
    if (!dontUpdate) {
        console.log("updating new model")
        newModel.updateModel();
    }
    return newModel;
    */
}
