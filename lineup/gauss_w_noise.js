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
    this.phase = 0;
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

function GaborContour(x, y, radius, delta, lambda, scaler)
{
    var ANGLE = 0, ASPECT = 1;

    this.radius = radius;
    this.mX = x;
    this.mY = y;
    this.delta = delta;
    this.lambda = lambda;
    this.gaborPatch = new Gabor(0, 0, delta, lambda, ANGLE, ASPECT, 1.0);
    this.scaler = scaler;
    this.noisePhase = Math.random()*1000;

    this.invisible = true;
}
GaborContour.prototype.perturb = function ()
{
}
GaborContour.prototype.copy = function ()
{
    return new GaborContour(this.mX, this.mY, this.radius, this.delta, this.lambda, this.scaler);
}

GaborContour.prototype.eval = function(x, y)
{
    var GABOR_SIGNAL = 1;
    var dX = x - this.mX;
    var dY = y - this.mY;
    var d = Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2)) - this.radius;
    var angle = Math.atan2(dY, dX)

    this.gaborPatch.updateAngle(-angle/4);

    // generate noise to scale the contour by
    // (so that it doesn't look like a sharp circle)
    var x = Math.cos(angle) * 5 + this.noisePhase;
    var r = 0.4 * (-1.6 * Math.sin(-1.4 * x) - 0.3 * Math.sin(2.4 * Math.E * x) + 0.9 * Math.sin(0.3 * Math.PI * x));
    r = .5 * (r + 1);

    return this.scaler * this.gaborPatch.eval(d, 0) * GABOR_SIGNAL * r;
}

function ClusterOfGauss(x, y, clusterSize, gaussCount, amplitude)
{
    this.x = x;
    this.y = y;

    this.invisible = true;
    this.clusterSize = clusterSize;
    this.members = [];
    this.amplitude = amplitude;

    var clusterRange = {
        x: [Number.MAX_VALUE, Number.MIN_VALUE],
        y: [Number.MAX_VALUE, Number.MIN_VALUE]
    };

    var theoreticalRange = [0, 0];

    var centroid = {x: this.x, y: this.y};

    for (var g=0; g<gaussCount; g++)
    {
        // gauss center: perturb up to 50% of clusterSize around cluster center
        var mx = this.x + (Math.random()*2-1) * .2 * this.clusterSize;
        var my = this.y + (Math.random()*2-1) * .2 * this.clusterSize;

        // standard deviation
        var MIN_SIGMA = .5 * this.clusterSize * .5;
        var MAX_SIGMA = .5 * this.clusterSize * 1.5;

        var sigmaX = Math.random()*(MAX_SIGMA-MIN_SIGMA) + MIN_SIGMA;
        var sigmaY = Math.random()*(MAX_SIGMA-MIN_SIGMA) + MIN_SIGMA;

        clusterRange.x[0] = Math.min(clusterRange.x[0], mx - sigmaX);
        clusterRange.x[1] = Math.max(clusterRange.x[1], mx + sigmaX);
        clusterRange.y[0] = Math.min(clusterRange.y[0], my - sigmaY);
        clusterRange.y[1] = Math.max(clusterRange.y[1], my + sigmaY);
        centroid.x += (mx - this.x) / gaussCount;
        centroid.y += (my - this.y) / gaussCount;

        // correlation for gaussians (limit to -0.3 to 0.3)
        var rho = (Math.random()*2-1) *0;
        //var amp = Math.random() * (amplitude[1]-amplitude[0]) + amplitude[0];
        var amp = amplitude[0];

        // make is a negative cluster?
        if (Math.random() < .5) {
            amp *= -1.0;
            this.negative = true;
        }
        else {
            this.negative = false;
        }
        // gaussian
        var gauss = new biGauss(mx, my, sigmaX, sigmaY, rho, amp);

        // evaluate gauss at center and at 1.5 SD
        theoreticalRange[1] += gauss.eval(mx, my);
        theoreticalRange[0] += gauss.eval(mx+sigmaX*1.5, my+sigmaY*1.5);

        this.members.push(gauss);
    }

    this.cX = centroid.x;
    this.cY = centroid.y;
    this.spatialRange = clusterRange;
    this.valueRange = theoreticalRange;

    // noise range
    var noiseMid = Math.random() * .8 + .1;
    var noiseRange = (this.valueRange[1]-this.valueRange[0]) * .2;
    this.noiseRange = [noiseMid - noiseRange, noiseMid + noiseRange];
    this.noiseAmplitude = this.valueRange[1] * .4;

}

ClusterOfGauss.prototype.eval = function(x, y)
{
    var v = 0;
    for (var models = this.members, i=0, len = this.members.length; i<len; i++)
    {
        var g = models[i];
        v += g.eval(x, y);
    }


    // add noise?
    /*
    if (this.noiseRange) {
        if (v >= this.noiseRange[0] && v <= this.noiseRange[1]) {
            v += this.noiseAmplitude;
        }
    }
    */


    return v;
}

ClusterOfGauss.prototype.copy = function()
{
    var c = new ClusterOfGauss(this.x, this.y, this.clusterSize, 0, this.amplitude);
    for (var i=0; i<this.members.length; i++) {
        c.members.push(this.members[i].copy());
    }

    c.spatialRange = this.spatialRange;
    c.valueRange = this.valueRange;
    c.noiseRange = this.noiseRange;
    c.noiseAmplitude = this.noiseAmplitude;

    return c;
}

ClusterOfGauss.prototype.perturb = function()
{
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
            if (d < minClusterDist)
            {
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
        console.error("Could not generate cluster that is far enough from the rest.")
        return null;
    }

    // how many gaussians?
    var MIN_GAUSS = 3;
    var MAX_GAUSS = 4;
    var gaussCount = MIN_GAUSS + Math.floor(.5 + Math.random() * (MAX_GAUSS-MIN_GAUSS));
    var cluster = new ClusterOfGauss(x, y, clusterSize, gaussCount, amplitude)

    // add members of the cluster to list of models
    /*
    for (var i=0; i<cluster.members.length; i++) {
        var g = cluster.members[i];
        this.models.push(g);
    }
    */
    this.models.push(cluster);

    /*
    // gabor patch
    var GABOR_CYCLES = 20;
    var LAMBDA = this.w / GABOR_CYCLES, ANGLE = 0, ASPECT = 1;
    var DELTA = 10;

    //var gabor = new Gabor(mx, my, sigmaX, LAMBDA, ANGLE, ASPECT, scaler * amp);

    if (this.clusters.length <= 1)
    {
        var scaler = cluster.negative ? -1.0 : 1.0;
        var sigma = Math.max(cluster.range.x[1]-cluster.range.x[0], cluster.range.y[1]-cluster.range.y[0]);

        var contour = new GaborContour(cluster.cX, cluster.cY, sigma*.5, DELTA, LAMBDA, scaler);
        this.models.push(contour);
    }
    */

    this.clusters.push(cluster);
    return cluster;

}

GaussMixWithNoise.prototype.init = function()
{
    // large clusters: low frequency / high-amplitude
    var LARGE_MIN_CLUSTERS = 6;
    var LARGE_MAX_CLUSTERS = 6;

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
