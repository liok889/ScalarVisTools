/* -------------------------------------
 * GLSL color analysis pipeline 
 * -------------------------------------
 */

function gLoadShader(object, shaderPath, shaderName, callback)
{
	object.loadShader(shaderPath, shaderName, callback);
}

ColorAnalysis = function(field, glCanvas)
{
	this.glCanvas = glCanvas;
	this.field = field;
	this.shaders = {};
	this.pipelines = null;

	// list of canvases to copy results to at the end of analysis (optional)
	this.copyList = [];

	// load shaders
	(function(object) {
		var q = d3.queue();
		q
			.defer( gLoadShader, object, 'design/src/shaders/vertex.vert', 'vertex' )
			.defer( gLoadShader, object, 'design/src/shaders/cie2000.frag', 'cie2000')
			.defer( gLoadShader, object, 'design/src/shaders/speed.frag', 'speed')
			//.defer( gLoadShader, object, 'src/shader/vis.frag', 'vis')

			.awaitAll(function(error, results) 
			{
				if (error) { 
					throw error;
				}
				else {
					console.log("shaders loaded");
					object.createPipelines();
					object.isReady = true;
				}
			});
	})(this)
}

ColorAnalysis.prototype.ready = function() {
	return this.isReady === true;
}

ColorAnalysis.prototype.createPipelines = function() 
{
	// create a color scale from extendedBlackBody to be used 
	// to visualzie cie2000de or speed
	var c = getColorPreset('extendedBlackBody');
	this.gpuDiffColormapTexture = c.createGPUColormap()

	var diffPipeline = new GLPipeline(this.glCanvas);
	diffPipeline.addStage({
		uniforms: {
			hPitch: {value: 1.0 / this.field.w},
			vPitch: {value: 1.0 / this.field.h},
			scalarField: {},
			colormap: {},
			colorDiffScale: {value: this.gpuDiffColormapTexture},
			outputColor: {value: true} 
		},
		inTexture: 'scalarField',
		fragment: this.shaders['cie2000'],
		vertex: this.shaders['vertex']
	});
	this.diffPipeline = diffPipeline;

	var speedPipeline = new GLPipeline(this.glCanvas)
	
	// add first stage to perform a cie2000 color-diff
	speedPipeline.addStage({
		uniforms: {
			hPitch: {value: 1.0 / this.field.w},
			vPitch: {value: 1.0 / this.field.h},
			scalarField: {},
			colormap: {},
			colorDiffScale: {value: this.gpuDiffColormapTexture},
			outputColor: {value: false} 
		},
		inTexture: 'scalarField',
		fragment: this.shaders['cie2000'],
		vertex: this.shaders['vertex']
	});

	// add a second stage
	speedPipeline.addStage({
		uniforms: {
			colorDiff: {},
			hPitch: {value: 1.0 / this.field.w},
			vPitch: {value: 1.0 / this.field.h},
			colorDiffScale: {value: this.gpuDiffColormapTexture},
		},
		inTexture: 'colorDiff',
		fragment: this.shaders['speed'],
		vertex: this.shaders['vertex']
	});
	this.speedPipeline = speedPipeline;

	// create a list of pipelines currently loaded
	this.pipelines = [diffPipeline, speedPipeline];
}

ColorAnalysis.prototype.loadShader = function(shaderPath, shaderName, callback)
{
	(function(_path, _name, object, _callback) 
	{
		d3.text(_path).then(function(text, error) 
		{
			if (error) {
				if (_callback) _callback(error); else throw error;
			} else
			{
				object.shaders[_name] = text;
				if (_callback) _callback(null);

			}
		})
	})(shaderPath, shaderName, this, callback);
}

ColorAnalysis.prototype.run = function(analysis)
{
	if (!this.pipelines) {
		console.error("Attempting to run ColorAnalysis pipeline before loading");
	}

	// deal with GPU texture
	if (!field.gpuTexture) {
		field.createGPUTexture();
	}

	// deal with color map
	if (!field.gpuColormapTexture) {
		field.setColorMap();
	}

	var pipeline = null;
	switch (analysis)
	{
	case 'diff':
		pipeline = this.diffPipeline;
		break;

	case 'speed':
		pipeline = this.speedPipeline;
		break;

	case 'vis':
		// simple visualization
	}

	// initialize stage0 to take scalarField as inTexture
	var stage0 = pipeline.getStage(0);
	var uniforms = stage0.getUniforms();
	uniforms[stage0.inTexture].value = this.field.gpuTexture;

	for (var i=0; i<pipeline.getStageCount(); i++) 
	{
		var s = pipeline.getStage(i);
		var u = s.getUniforms();
		
		// does this stage require a colormap?
		if (u.colormap) {
			// if so, give it the current colormap associated with the scalar field
			u.colormap.value = field.gpuColormapTexture;
		}
	}

	pipeline.run();

	// deal with copy list
	for (var i=0; i<this.copyList.length; i++) 
	{
		var copyTarget = this.copyList[i];

		// read the color diff
		var gl = this.glCanvas.getContext('webgl');
		var w = gl.drawingBufferWidth;
		var h = gl.drawingBufferHeight;

		var pixels = new Uint8Array(w * h * 4);
		gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

		// flip pixels
		var flipPixels = new Uint8Array(w * h * 4);
		var I=0;
		for (var r=h-1; r>=0; r--) 
		{
			var rI = r * w * 4;
			for (var c=0; c<w; c++, I+=4, rI += 4) 
			{
				flipPixels[I] = pixels[rI];
				flipPixels[I+1] = pixels[rI+1];
				flipPixels[I+2] = pixels[rI+2];
				flipPixels[I+3] = pixels[rI+3];
			}
		}

		// copy them to the 'DiffCanvas'
		var ctx = copyTarget.getContext('2d');
		var imgData = ctx.getImageData(0, 0, w, h);
		imgData.data.set(flipPixels);
		ctx.putImageData(imgData, 0, 0);
	}
}


ColorAnalysis.prototype.addCopyCanvas = function(canvas) 
{
	// render color diff
	this.copyList.push(canvas);
}
