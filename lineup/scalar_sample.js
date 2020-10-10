var BLUR=true;
ALL_SAMPLERS = [];

var CALLBACK_SAMPLE = true;

var shaderList = [
    {name: 'vis',		path: 'design/src/shaders/vis.frag'},
    {name: 'vertex',	path: 'design/src/shaders/vertex.vert'},
    {name: 'blur',		path: 'design/src/shaders/blur.frag'}
];

function ScalarSample(w, h, canvas, model, colormap)
{
    this.w = w;
    this.h = h;
    this.field = new ScalarField(w, h);
    this.model = model;
    this.canvas = canvas;

    // add myself to the model
    if (model) {
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
                function() { me.initVisPipeline(); }, shaderList
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

ScalarSample.prototype.setColorMap = function(colormap)
{
    this.field.setColorMap(colormap);
}

ScalarSample.setUniversalColormap = function(colormap) {
    for (var i=0; i<ALL_SAMPLERS.length; i++)
    {
        ALL_SAMPLERS[i].setColorMap(colormap);

        // render?
        ALL_SAMPLERS[i].vis();
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
    model.sampleModel(fidelity, this.field);
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
