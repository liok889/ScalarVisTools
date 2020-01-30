var BLUR=true;
ALL_SAMPLERS = [];
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

    var shaderList = [
        {name: 'vis',		path: 'design/src/shaders/vis.frag'},
        {name: 'vertex',	path: 'design/src/shaders/vertex.vert'},
        {name: 'blur',		path: 'design/src/shaders/blur.frag'}
    ];

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
    ALL_SAMPLERS.push(this);
}

ScalarSample.setUniversalColormap = function(colormap) {
    for (var i=0; i<ALL_SAMPLERS.length; i++)
    {
        ALL_SAMPLERS[i].field.setColorMap(colormap);

        // render?
        ALL_SAMPLERS[i].vis();
    }
}

ScalarSample.prototype.setModel = function(_model)
{
    if (this.model) {
        this.model.unregisterCallback(this.callbackID);
        this.model = null;
    }

    this.model = _model;
    (function(me) {
        me.callbackID = me.model.addCallback(function() {
            me.sampleModel();
            if (me.canvas) {
                me.vis();
            }
        });
    })(this);

    if (this.canvas)
    {
        this.sampleModel();
        this.vis();
    }
}

ScalarSample.prototype.setSamplingFidelity = function(fidelity)
{
    this.localN = fidelity;
}

ScalarSample.prototype.sampleModel = function() {
    var fidelity = this.localN;
    if (!fidelity || isNaN(fidelity)) {
        fidelity = N;
    }
    this.model.sampleModel(fidelity, this.field);
}

ScalarSample.prototype.sampleAndVis = function()
{
    this.sampleModel();
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
