var BLUR=false;
var SCALAR_UPPER_PERCENTILE = 1-.01/10;
var HISTOGRAM_BINS = 60;

// disable renderer caching, forcing new canvases each time
ALL_SAMPLERS = [];

var CALLBACK_SAMPLE = true;

var shaderList = [
    {name: 'vis',		path: 'design/src/shaders/vis.frag'},
    {name: 'vertex',	path: 'design/src/shaders/vertex.vert'},
    {name: 'blur',		path: 'design/src/shaders/blur.frag'}
];

function ScalarSample(w, h, canvas, model, colormap)
{
    console.log('scalar sample constructor');
    this.w = w;
    this.h = h;
    this.field = new ScalarField(w, h);
    this.model = model;
    this.canvas = canvas;

    // add myself to the model
    if (model) 
    {
        this.setModel(model);
    }

    // if we're passed a d3 selection, convert to a standard canvas
    if (this.canvas.selectAll) {
        this.canvas = this.canvas.node();
    }

    if (this.canvas)
    {
        (function(me) {
            me.visualizer = new ColorAnalysis(
                me.field, me.canvas,
                function() 
                {
                    console.log('initVisPipeline'); 
                    me.initVisPipeline(); 
                }, shaderList
            );
        })(this);
    }

    if (!colormap) {
        this.field.setColorMap(getColorPreset('viridis'));
    }
    else {
        this.field.setColorMap(colormap);
    }
    ALL_SAMPLERS.push(this);
}

ScalarSample.prototype.dispose = function()
{
    for (var i=0; i<ALL_SAMPLERS.length; i++) {
        var s = ALL_SAMPLERS[i];
        if (s == this) {
            ALL_SAMPLERS.splice(i, 1);
            break;
        }
    }

    if (this.canvas) {
        var c = this.canvas
        if (!c.attr) {
            c = d3.select(this.canvas);
        }
        removeRenderCache(c.attr('id'));

    }
    this.field = null;
    this.model = null;
    this.canvas = null;
    this.w = null;
    this.h = null;
}

ScalarSample.prototype.setColorMap = function(colormap)
{
    this.field.setColorMap(colormap);
}

ScalarSample.setUniversalColormap = function(colormap, dontVis) {
    for (var i=0; i<ALL_SAMPLERS.length; i++)
    {
        ALL_SAMPLERS[i].setColorMap(colormap);

        // render?
        if (!dontVis) {
         ALL_SAMPLERS[i].vis();
        }
    }
}

ScalarSample.prototype.setModel = function(_model, dontVis)
{
    if (this.model) {
        this.model.unregisterCallback(this.callbackID);
        this.model = null;
    }

    this.model = _model;
    (function(me) {
        me.callbackID = me.model.addCallback(function() 
        {
            if (CALLBACK_SAMPLE || me.callbackSample) 
            {
                console.log('callback sampling');
                me.sampleModel();
                if (me.canvas || me.svg) {
                    me.vis();
                }
            }
        });
    })(this);

    if (this.canvas && !dontVis)
    {
        this.sampleModel();
        this.vis();
    }
}

ScalarSample.prototype.setSamplingFidelity = function(fidelity)
{
    this.localN = fidelity;
}

ScalarSample.prototype.sampleModel = function(_fidelity, model)
{
    var fidelity = !isNaN(_fidelity) ? _fidelity : this.localN;
    if (!fidelity || isNaN(fidelity)) {
        if (typeof N === 'undefined') {
            fidelity = 0;
        }
        else {
            fidelity = N;
        }
    }
    if (!model) {
        model = this.model;
    }

    var upperPercentile = undefined;
    if (typeof SCALAR_UPPER_PERCENTILE !== 'undefined') {
        upperPercentile = SCALAR_UPPER_PERCENTILE;
    }
    model.sampleModel(fidelity, this.field, upperPercentile);
}

ScalarSample.prototype.sampleAndVis = function(_fidelity)
{
    this.sampleModel(_fidelity);
    this.vis();
}

ScalarSample.prototype.vis = function()
{
    if (!this.canvas)
    {
        console.log("Error: ScalarSample doesn't have a canvas.");
    }
    else if (!this.visualizer || !this.visualizer.ready())
    {
        // pipeline not yet ready. Set flag to callVis when it's ready
        this.callVisFlag = true;
    }
    else {
        this.visualizer.run(BLUR ? 'blur' : 'vis');
    }
}

ScalarSample.prototype.computeValueHistogram = function(_bins)
{

    var field = this.field;
    var hist = field.calcAmplitudeFrequency(_bins || HISTOGRAM_BINS);
    var histSum = d3.sum(hist);
    for (var i=0; i<hist.length; i++) {
        hist[i] /= histSum;
    }
    return hist;
}

ScalarSample.prototype.initVisPipeline = function()
{
    if (!this.canvas) {
        console.log("Error: ScalarSample doesn't have a canvas.");
        return;
    }

    // standard vis
    var vis = new GLPipeline(this.visualizer.glCanvas);
    vis.addStage({
        uniforms: {
            scalarField: {},
            colormap: {},
            contour: {value: -1.0},
        },
        inTexture: 'scalarField',
        fragment: this.visualizer.shaders['vis'],
        vertex: this.visualizer.shaders['vertex']
    });

    // blur + vis
    var blur = new GLPipeline(this.visualizer.glCanvas);
    blur.addStage({
        uniforms: {
            scalarField: {},
            colormap: {},
            pitch: {value: [1/this.field.w, 1/this.field.h]}
        },
        inTexture: 'scalarField',
        fragment: this.visualizer.shaders['blur'],
        vertex: this.visualizer.shaders['vertex']
    });


    this.visualizer.pipelines = {
        vis: vis,
        blur: blur
    };

    //this.visualizer.createVisPipeline();
    if (this.callVisFlag) {
        this.callVisFlag = false;
        this.vis();
    }
}
