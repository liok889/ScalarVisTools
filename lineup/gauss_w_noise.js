function Gabor(mX, mY, delta, lambda, angle, aspect, scaler)
{
    this.mX = mX;
    this.mY = mY;
    this.delta = delta;
    this.sigma = delta/2;
    this.sigma2 = Math.pow(this.sigma, 2);
    this.lambda = lambda;
    this.angle = angle;
    this.aspect = aspect;
    this.aspect2 = aspect * aspect;
    this.phase = Math.PI/2;
    this.scaler = scaler;

    this.cosAngle = Math.cos(-this.angle);
    this.sinAngle = Math.sin(-this.angle);
}

Gabor.prototype.getSigmaX = function() { return this.delta; }
Gabor.prototype.getSigmaY = function() { return this.delta / this.aspect; }
Gabor.prototype.updateSigmaX = function(delta)
{
    var sigmaY = this.getSigmaY();
    this.delta = delta;
    this.sigma = delta/2;
    this.sigma2 = Math.pow(this.sigma, 2);
    this.aspect = delta / sigmaY;
    this.aspect2 = Math.pow(this.aspect, 2);
}
Gabor.prototype.updateSigmaY = function(delta) {
    var sigmaY = delta/2;
    this.aspect = this.sigma/sigmaY;
    this.aspect2 = Math.pow(this.aspect, 2);
}

Gabor.prototype.getAspectRatio = function() { return this.aspect; }
Gabor.prototype.getAngle = function() { return this.angle; }
Gabor.prototype.updateAngle = function(angle) {
    this.angle = angle;
    this.cosAngle = Math.cos(-this.angle);
    this.sinAngle = Math.sin(-this.angle);
}


Gabor.prototype.copy = function()
{
    return new Gabor(
        this.mX, this.mY, this.delta, this.lambda, this.angle, this.aspect, this.scaler
    );
}

Gabor.prototype.perturb = function()
{
}

Gabor.prototype.eval = function(_x, _y)
{
    var x = _x - this.mX;
    var y = _y - this.mY;

    var xPrime =  x * this.cosAngle + y * this.sinAngle;
    var yPrime = -x * this.sinAngle + y * this.cosAngle;

    var e = (Math.pow(xPrime, 2) + this.aspect2 * Math.pow(yPrime, 2)) / (2 * this.sigma2);
    var s = 2 * Math.PI * (xPrime/this.lambda) + this.phase;

    return this.scaler * Math.exp(-e) * Math.sin(s);
}

function GaussMixWithNoise(w, h, svg)
{
    GaussMixBivariate.call(this, w, h, svg);
}

// chain
GaussMixWithNoise.prototype = new GaussMixBivariate();
GaussMixWithNoise.prototype.constructor = GaussMixBivariate;

GaussMixWithNoise.prototype.addCluster = function(_clusterSize, amplitude)
{
    // padding as 7% of width/height
    var padX = this.w * .07;
    var padY = this.h * .07;

    // cluster width / height as 15%
    var clusterSize = Math.min(this.w, this.h) * (_clusterSize ? _clusterSize : .4);
    var minClusterDist = clusterSize * .9

    var W = this.w - padX*2;
    var H = this.h - padY*2;
    //console.log("add cluster: " + W + ', ' + H)

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
    var MIN_GAUSS = 1//3;
    var MAX_GAUSS = 1//4;
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
        var rho = (Math.random()*2-1) *0;

        var scaler = cluster.negative ? -1 : 1;
        var amp = Math.random() * (amplitude[1]-amplitude[0]) + amplitude[0];

        // gaussian
        var gauss = new biGauss(mx, my, sigmaX, sigmaY, rho, scaler * amp);

        // gabor
        var GABOR_CYCLES = 24;
        var LAMBDA = this.w / GABOR_CYCLES, ANGLE = 0, ASPECT = .5;
        var gabor = new Gabor(mx, my, sigmaX, LAMBDA, ANGLE, ASPECT, scaler * amp);

        this.models.push(gabor);
        cluster.members.push(gabor);
    }

    return cluster;

}

GaussMixWithNoise.prototype.init = function()
{
    // large clusters: low frequency / high-amplitude
    var LARGE_MIN_CLUSTERS = 1//4;
    var LARGE_MAX_CLUSTERS = 1//8;

    // small clusters: dictate high-frequency features of the data
    var SMALL_MIN_CLUSTERS = 10;
    var SMALL_MAX_CLUSTERS = 12;

    var LARGE_CLUSTER_SIZE = 0.4;   // 40% of min(width,height)
    var SMALL_CLUSTER_SIZE = 0.05;
    var LARGE_CLUSTER_AMPLITUDE = [1.0, 1.0];
    var SMALL_CLUSTER_AMPLITUDE = [.01/1.5, .01/1.5];

    this.clusters = [];
    this.models = [];

    // figure out how many clusters we need

    // create clusters, large and small
    var clusterCount = Math.floor(.5 + Math.random() * (LARGE_MAX_CLUSTERS-LARGE_MIN_CLUSTERS)) + LARGE_MIN_CLUSTERS;
    for (var i=0; i<clusterCount; i++)
    {
        var cluster = this.addCluster(LARGE_CLUSTER_SIZE, LARGE_CLUSTER_AMPLITUDE);
        this.clusters.push(cluster);
    }

    /*
    clusterCount = Math.floor(.5 + Math.random() * (SMALL_MAX_CLUSTERS-SMALL_MIN_CLUSTERS)) + SMALL_MIN_CLUSTERS;
    for (var i=0; i<clusterCount; i++)
    {
        var cluster = this.addCluster(SMALL_CLUSTER_SIZE, SMALL_CLUSTER_AMPLITUDE);
        this.clusters.push(cluster);
    }
    */


    //this.models.sort(function(a,b) { return a.scaler-b.scaler });

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

    // copy copy clusters
    /*
    newModel.clusters = [];
    for (var i=0, clusters=this.clusters; i<clusters.length; i++)
    {
        var c=clusters[i];
        var newC = {
            x: c.x,
            y: c.y,
            members: [],
            children: [],
            negative: c.negative;
        };

        newModel.clusters.push()
    }
    */

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
