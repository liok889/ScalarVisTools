/* -------------------------------------------
 * Utility implementing a multi-stage image
 * processing pipeine in GLSL
 * -------------------------------------------
 */

var RENDERERS = {};
function getRenderer(nameOrCanvas) 
{
	var name = typeof nameOrCanvas === "string" ? nameOrCanvas : nameOrCanvas.id;
	var canvas = document.getElementById(name);

	if (RENDERERS[name]) {
		return RENDERERS[name];
	}
	else
	{
		var r = new THREE.WebGLRenderer({ 
			canvas: canvas
		});
		r.setClearColor(0x000000, 1);
		RENDERERS[name] = r;
		return r;
	}
}

function PipelineStage(stage)
{
	this.info = stage;
	this.inTexture = stage.inTexture;

	// load shader
	this.shader = new THREE.ShaderMaterial(
	{
		uniforms: stage.uniforms,
		fragmentShader: stage.fragment,
		vertexShader: stage.vertex,
		side: THREE.DoubleSide
	});

	// create scene 
	if (!this.scene)
	{
		var squareMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.shader); 
		this.scene = new THREE.Scene();
		this.scene.add(squareMesh);
		this.camera = new THREE.OrthographicCamera(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0);
	}
}

PipelineStage.prototype.getUniforms = function() 
{
	return this.shader.uniforms;
}

function GLPipeline(_destCanvas)
{
	this.destCanvas = _destCanvas;
	this.pipeline = [];

	// get OpenGL context
	this.renderer = getRenderer(this.destCanvas);

	this.buffers = [];
	this.frontBuffer = -1;
	
	// pipeline stages
	this.stages = [];
}

GLPipeline.prototype.addStage = function(stage) 
{
	if (this.pipeline.length == 0) 
	{
		// no need for extra buffer at this point
	}
	else
	{
		// creat an offscreen buffer
		/*
		var canvas = this.destCanvas;
		this.buffers = [
			new THREE.WebGLRenderTarget( canvas.width, canvas.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter} ),
			new THREE.WebGLRenderTarget( canvas.width, canvas.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter} )
		];
		this.frontBuffer = 0;
		*/
	}

	this.stages.push(new PipelineStage(stage));
}

GLPipeline.prototype.getFront = function() {
	return this.buffers[this.frontBuffer];
}
GLPipeline.prototype.getBack = function() {
	return this.buffer[this.frontBuffer == 0 ? 1 : 0];
}
GLPipeline.prototype.flipBuffers = function() {
	if (this.frontBuffer == 0) {
		this.fontBuffer = 1;
	}
	else {
		this.frontBuffer = 0;
	}
}

GLPipeline.prototype.run = function() 
{
	for (var i=0, len=this.stages.length; i < len; i++) 
	{
		var stage = this.stages[i];
		
		// set shader to take texture from the previous stage
		if (i>0) {
			stage.shader.uniforms[ stage.inTexture ] = this.getFront().texture;
		}

		
		if (i==len-1) 
		{
			this.renderer.render(stage.scene, stage.camera);
		}
		else
		{
			this.renderer.render(stage.scene, stage.camera, this.getBack());

			// flip buffers
			this.flipBuffer();
		}
	}
}

GLPipeline.prototype.getStageCount = function() {
	return this.stages.length;
}

GLPipeline.prototype.getStage = function(index) {
	return this.stages[index];
}

