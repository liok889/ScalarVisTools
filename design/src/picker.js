/* -------------------------------------
 * Color Picker tool
 * -------------------------------------
 */

var COLORSPACE_LAB = 1;
var COLORSPACE_CAM02 = 2;


var A_RANGE=[-115, 115];
var B_RANGE=[-115, 115];

var JAB_A_RANGE = [-45, 45];
var JAB_B_RANGE = [-45, 45];


var CHANNEL_RAMP_OFFSET = 10;

function interpolateLinear(c0, c1, t)
{
	return [
		c0[0] + t*(c1[0]-c0[0]),
		c0[1] + t*(c1[1]-c0[1]),
		c0[2] + t*(c1[2]-c0[2])
	];	
}

function interpolateBezier(controls, t) 
{
	if (controls.length == 2) 
	{
		return interpolateLinear(controls[0], controls[1], t);
	}
	else
	{
		var newControls = [];
		for (var i=0; i<controls.length-1; i++) 
		{
			newControls.push(
				interpolateLinear(controls[i], controls[i+1], t)
			);
		}
		return interpolateBezier(newControls, t);
	}
}

function isArray (value) {
	return value && typeof value === 'object' && value.constructor === Array;
}

function ColorPicker(svg, mainCanvas, channelCanvas, threeDCanvas) 
{
	this.svg = svg;
	this.mainCanvas = mainCanvas;
	this.channelCanvas = channelCanvas;
	this.threeDCanvas = threeDCanvas;

	// default to using CIE LAB color space
	this.colorSpace = COLORSPACE_LAB;

	// location of current selection on the channel
	// this should be a normalized number between 0 and 1
	this.channelPos = 0.5;
	this.renderChannel();
	this.armEvents();
	this.renderPerceptual();

	this.currentColor = null;

	// callbacks, initially empty 
	this.callbacks = [];

	// shows color curve
	this.colorCurve = null;

	// create a 'path' to visualize the map's curve in the color space
	this.controlGroup = svg.append('g');
	this.colormapCurve = this.controlGroup.append('path').attr('class', 'colormapCurve');

	this.bControls = [];
	this.luminanceProfile = 'linear';
}

ColorPicker.prototype.addBControl = function(color) 
{	
	var MAX_B_CONTROLS = 12;
	if (this.colorSpace == COLORSPACE_CAM02) {
		color = d3.jab(color);
	}
	if (this.bControls.length < MAX_B_CONTROLS) {
		this.bControls.push(color);
	}
	this.updateBControl();
}

ColorPicker.prototype.changeLuminanceProfile = function(profile)
{
	this.luminanceProfile = profile;
	this.instantiateColorMap();
}

ColorPicker.prototype.instantiateColorMap = function()
{
	var SAMPLES = 50;
	var MIN_L = 10;
	var MAX_L = 90;

	if (this.bControls.length >= 2)
	{
		// convert control group to an Array format
		var controls = [];
		for (var i=0; i < this.bControls.length; i++) 
		{
			var c = this.bControls[i];
			var cc = [this.colorSpace == COLORSPACE_LAB ? c.l : c.J, c.a, c.b];
			controls.push(cc);
		}

		// interpolate the curve
		this.colormapCoordinates = [];
		var colorset = [];

		for (var i=0; i<SAMPLES; i++) 
		{
			var t = i/(SAMPLES-1);
			var c = interpolateBezier(controls, t);

			// color map properties
			if (this.luminanceProfile == 'linear') {
				c[0] = MIN_L + t*(MAX_L-MIN_L);
			}
			else if (this.luminanceProfile == 'divergent')
			{
				if (t < 0.5) {
					c[0] = MIN_L + 2*t*(MAX_L-MIN_L)
				}
				else if (t > 0.5)
				{
					c[0] = MIN_L + 2*(1-t)*(MAX_L-MIN_L);
				}
				else {
					c[0] = MAX_L;
				}
			}
			if (this.colorSpace == COLORSPACE_LAB) 
			{
				c = d3.lab(c[0], c[1], c[2]);
			}
			else if (this.colorSpace == COLORSPACE_CAM02)
			{
				c = d3.jab(c[0], c[1], c[2]);
			}

			// add to the color map
			var cLab = d3.lab(c);
			colorset.push({
				value: t,
				lab: [cLab.l, cLab.a, cLab.b]
			});

			// now take that color and convert it coordinates
			var coord = this.coordFromColor(c);

			// add to coordinates
			this.colormapCoordinates.push(coord);
		}
		this.plotColormapCurve2D();
		this.plotColormapCurve3D();

		// instantiate a new color map
		var theColormap = new ColorMap(colorset, COLORSPACE_LAB ? 'lab' : 'jab');

		for (var i=0; i<this.callbacks.length; i++) {
			var callback = this.callbacks[i];
			if (callback.event == 'instantiateColormap') {
				callback.callback(theColormap);
			}
		}
		return theColormap;
	}
	else
	{
		return null;
	}
}

ColorPicker.prototype.updateBControl = function() 
{
	var B_CONTROL_R = 4;
	this.colormapCurve.attr('d', null);

	// show the curves
	var w = +this.mainCanvas.width, h = +this.mainCanvas.height;
	var u = this.controlGroup.selectAll('circle.bControlPoint').data(this.bControls);
	u.exit().remove();
	u = u.enter().append('circle')
		.attr('class', 'bControlPoint')
		.attr('r', B_CONTROL_R).merge(u);
	
	// add circles
	(function(u, picker) {
		u.each(function(d, i) 
		{
			var colorSpace = picker.colorSpace;
			var a_range = colorSpace==COLORSPACE_LAB ? A_RANGE : JAB_A_RANGE;
			var b_range = colorSpace==COLORSPACE_LAB ? B_RANGE : JAB_B_RANGE;
			var c = colorSpace==COLORSPACE_LAB ? d3.lab(d) : d3.jab(d);

			var aScale = d3.scaleLinear().domain(a_range).range([0, w-1]);
			var bScale = d3.scaleLinear().domain(b_range).range([h-1, 0]);

			var x = aScale(c.a);
			var y = bScale(c.b);
			var L = colorSpace==COLORSPACE_LAB ? c.l : c.J;

			d3.select(this)
				.attr('cx', x).attr('cy', y);
		})
		.on('mousedown', function(d, i) 
		{
			d3.select(this).style('stroke-width', '2px');
			picker.selectedBControl = i;
			picker.selectedCircle = d3.select(this);
			d3.select(document).on('mousemove.bControl', function() {
				
				var m = d3.mouse(picker.svg.node());
				var c = picker.colorFromMouse(m);
				if (picker.colorSpace == COLORSPACE_CAM02) {
					c = d3.jab(c);
				}
				picker.bControls[ picker.selectedBControl ] = c;
				picker.selectedCircle.attr('cx', m[0]).attr('cy', m[1]);
				picker.updateBControl();
			})
			d3.select(document).on('mouseup.bControl', function() 
			{
				d3.select(document)
					.on('mousemove.bControl', null)
					.on('mouseup.bControl', null);
				
				picker.selectedCircle.style('stroke-width', null);
				picker.selectedBControl = undefined;
				picker.selectedCircle = undefined;
			})
			d3.event.stopPropagation();
		})

	})(u, this);
	return this.instantiateColorMap();
}

ColorPicker.prototype.changeColorSpace = function(newSpace) {
	this.colorSpace = newSpace;
	this.renderChannel();
	this.renderPerceptual();
}

ColorPicker.prototype.registerCallback = function(event, callback, id) 
{
	// two events are supported: preview and pick
	this.callbacks.push({ event: event, callback: callback, id: id });
}
ColorPicker.prototype.unregisterCallback = function(id)
{
}

ColorPicker.prototype.renderChannel = function() {

	var canvas = this.channelCanvas;
	var context = canvas.getContext("2d");

	var width = canvas.width;
	var height = canvas.height;
	var image = context.createImageData(width, height);

	// what should the aux canvas be?
	switch (this.colorSpace) 
	{


	case COLORSPACE_CAM02:
	case COLORSPACE_LAB:

		// luminance interpolation
		for (var i=0; i<height; i++)
		{
			var cLAB = this.colorSpace == COLORSPACE_LAB 
				? d3.lab(100-100*i/(height-1), 0.0, 0.0)
				: d3.jab(100-100*i/(height-1), 0.0, 0.0);

			var cRGB = d3.rgb(cLAB);

			var I = i * width * 4;
			for (var j=0; j < width-CHANNEL_RAMP_OFFSET; j++) 
			{
				image.data[I+j*4  ] = cRGB.r;
				image.data[I+j*4+1] = cRGB.g;
				image.data[I+j*4+2] = cRGB.b;
				image.data[I+j*4+3] = 255;
			}

		}
		break;

	default:
		for (var i=0; i<height; i++) 
		{
			var cCAM = d3.jab(100-100*i/(height-1), 0.0, 0.0);

		}

		break;
	}

	// store the image data
	this.channelImage = image;

	// display it
	context.putImageData(image, 0, 0);

	// create a thing rectangle to indicate currently selected position along with channel
	this.drawChannelSelection();
}

ColorPicker.prototype.drawChannelSelection = function() 
{
	var context = this.channelCanvas.getContext("2d");
	var height = this.channelCanvas.height;
	var width = this.channelCanvas.width;

	context.fillStyle="#222222";
	context.putImageData(this.channelImage, 0, 0);

	var y = (height-1) * this.channelPos;

	var path=new Path2D();
	path.moveTo(width - CHANNEL_RAMP_OFFSET, y);
	path.lineTo(width-1, y-6);
	path.lineTo(width-1, y+6);
	context.fill(path);
}

ColorPicker.prototype.plotColormap = function(colorPoints)
{
	var coordinates = [];
	for (var i=0; i<colorPoints.length; i++) 
	{
		var p = colorPoints[i];
		var c = this.coordFromColor(p.color);
		coordinates.push(c)
	}
	this.colormapCoordinates = coordinates;

	// plot the 2D color map curve
	this.plotColormapCurve2D();

	// plot the 3D color map curve
	if (this.threeDCanvas) {
		this.plotColormapCurve3D();
	}


}
ColorPicker.prototype.plotColormapCurve2D = function() 
{
	var w = +this.mainCanvas.width;
	var h = +this.mainCanvas.height;
	var lineGen = d3.line()
		.x(function(d) { return d.x * (w-1);})
		.y(function(d) { return d.y * (w-1);});

	this.colormapCurve.attr('d', lineGen(this.colormapCoordinates));
}

ColorPicker.prototype.plotColormapCurve3D = function()
{
	if (!this.renderer) 
	{
		var canvas = this.threeDCanvas;
		this.renderer = new THREE.WebGLRenderer({ 
			canvas: canvas
		});
		this.renderer.setClearColor(0xcccccc, 1);
	
		var camera = new THREE.PerspectiveCamera( 45, +canvas.width / +canvas.height, 1, 1000 );
		camera.position.set( 0, 0, 400 );
		camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

		// add controls to camera
		controls = new THREE.OrbitControls( camera, this.renderer.domElement );
		(function(_controls, picker) {
			_controls.addUpdateCallback(function() {
				picker.renderer.render(picker.scene, picker.camera);
			});
		})(controls, this)
		this.camera = camera;


		var planeGeom = new THREE.PlaneBufferGeometry( 100, 100, 8, 8 )
		var mat = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 1 } );
		var wireframe = new THREE.LineSegments( planeGeom, mat );
		this.plane = wireframe;
		this.plane.rotateX( Math.PI / 2 )
	}

	//create a blue LineBasicMaterial
	var material = new THREE.LineBasicMaterial( { color: 0x01188e, linewidth: 4.0 } );
	var geometry = new THREE.Geometry();

	// insert vertices
	var coordinates = this.colormapCoordinates;
	var a_range = this.colorSpace == COLORSPACE_LAB ? A_RANGE : JAB_A_RANGE;
	var b_range = this.colorSpace == COLORSPACE_LAB ? B_RANGE : JAB_B_RANGE;
	

	for (var i=0, len=coordinates.length; i<len; i++)
	{
		var p = coordinates[i];
		geometry.vertices.push(new THREE.Vector3( 100*(p.x-.5), 100*p.z, 100*(p.y-.5) ));
	}
	var line = new THREE.Line( geometry, material );
	var scene = new THREE.Scene();
	scene.add(line);
	scene.add(this.plane);
	this.scene = scene;
	this.renderer.render( scene, this.camera );

}

ColorPicker.prototype.armEvents = function() {

	(function(picker) {
		d3.select(picker.channelCanvas).on("mousedown", function() {
			d3.select(document)

				.on("mousemove.channelPicker", function() 
				{
					var m = d3.mouse(picker.channelCanvas);
					var h = picker.channelCanvas.height
					m[1] = Math.min(h, Math.max(0, m[1]));
					picker.channelPos = m[1] / h;
					picker.drawChannelSelection();

					// update
					switch (picker.colorSpace)
					{
					case COLORSPACE_CAM02:
					case COLORSPACE_LAB:
						picker.renderPerceptual();
						break;
					}
				})
				.on("mouseup.channelPicker", function() {
					d3.select(document)
						.on("mousemove.channelPicker", null)
						.on("mouseup.channelPicker", null);
				})

		})

		picker.svg
			.on('mousemove', function() {

				var c = picker.colorFromMouse(d3.mouse(this));
				if (picker.mouseDown) {
					picker.pickColor(c);
				}
				else {
					picker.previewColor(c);
				}
			})
			.on('mouseout', function() {
				picker.previewColor();
			})
			.on('mousedown', function() 
			{
				if (d3.event.shiftKey)
				{
					// add a control ppoint
					var c = picker.colorFromMouse(d3.mouse(this));
					picker.addBControl(c);
				
				}
				else
				{
					var c = picker.colorFromMouse(d3.mouse(this));
					picker.pickColor(c);
					picker.mouseDown = true;
				}
			})
			.on('dblclick', function() {
				if (d3.event.shiftKey) {
					picker.bControls = [];
					picker.updateBControl();
				}
			})
			.on('mouseup', function() {
				picker.mouseDown = false;
			});
	})(this);
}

ColorPicker.prototype.coordFromColor = function(color)
{
	if (isArray(color)) {
		// assume this is a lab color
		color = d3.lab(color[0], color[1], color[2])
	}

	var w = +this.mainCanvas.width, h = +this.mainCanvas.height;
	var xScale = d3.scaleLinear(), yScale = d3.scaleLinear(), x, y, L, c;
	switch (this.colorSpace)
	{
	case COLORSPACE_LAB:
		xScale.range([0, 1]).domain(A_RANGE);
		yScale.range([1, 0]).domain(B_RANGE);	
		c = d3.lab(color);		
		L = c.l;
		break;

	case COLORSPACE_CAM02:
		xScale.range([0, 1]).domain(JAB_A_RANGE);
		yScale.range([1, 0]).domain(JAB_B_RANGE);
		c = d3.jab(color);
		L = c.J;
		break;
	}

	x = xScale(c.a);
	y = yScale(c.b);
	z = L/100;
	return {x: x, y: y, z: z};
}

ColorPicker.prototype.colorFromMouse = function(mouse) 
{
	var canvas = this.mainCanvas;
	var w = +this.mainCanvas.width;
	var h = +this.mainCanvas.height;

	var xScale, yScale, A, B;

	switch (this.colorSpace)
	{
	case COLORSPACE_LAB:
		xScale = d3.scaleLinear().domain([0, w-1]).range(A_RANGE);
		yScale = d3.scaleLinear().domain([h-1, 0]).range(B_RANGE);			
		B = yScale(mouse[1]);
		A = xScale(mouse[0]);
		return d3.lab((1-this.channelPos)*100, A, B);
		break;
	
	case COLORSPACE_CAM02:
		xScale = d3.scaleLinear().domain([0, w-1]).range(JAB_A_RANGE);
		yScale = d3.scaleLinear().domain([h-1, 0]).range(JAB_B_RANGE);			
		B = yScale(mouse[1]);
		A = xScale(mouse[0]);
		return d3.lab(d3.jab((1-this.channelPos)*100, A, B));	
	}

}

ColorPicker.prototype.switchToColor = function(c)
{
	switch (this.colorSpace)
	{
	case COLORSPACE_CAM02:
	case COLORSPACE_LAB:

		var cLab = d3.lab(c);
		if (!cLab.displayable()) {
			//console.log("\tNon-displayable");
		}
		else
		{
			// adjust the channel position to match luminance of given color
			this.channelPos = 1 - cLab.l / 100;
			this.drawChannelSelection();	

			// change the color div to reflect selection
			d3.select('#pickedColor')
				.style('background-color', c.toString());
			this.renderPerceptual();
			this.markColor(c);
		}

		break;
	}
}

ColorPicker.prototype.markColor = function(c) 
{
	var a_range, b_range;
	switch (this.colorSpace)
	{
	case COLORSPACE_CAM02:
		c = d3.jab(c);
		a_range = JAB_A_RANGE;
		b_range = JAB_B_RANGE;
		break;

	case COLORSPACE_LAB:
		c = d3.lab(c);
		a_range = A_RANGE;
		b_range = B_RANGE;
		break;
	}

	// draw a simple cross sign
	var aS = d3.scaleLinear().domain(a_range).range([0, +this.mainCanvas.width]);
	var bS = d3.scaleLinear().domain(b_range).range([+this.mainCanvas.height, 0]);
	var x = aS(c.a);
	var y = bS(c.b);

	var ctx = this.mainCanvas.getContext('2d');
	ctx.beginPath();
	ctx.moveTo(x-5, y);
	ctx.lineTo(x+5, y);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(x, y-5);
	ctx.lineTo(x, y+5);
	ctx.stroke();	
}

ColorPicker.prototype.pickColor = function(c, skipCallback) 
{
	switch (this.colorSpace)
	{

	case COLORSPACE_CAM02:
	case COLORSPACE_LAB:

		var cLab = d3.lab(c);
		if (!cLab.displayable()) {
			console.log("\tNon-displayable");
		}
		else
		{
			// adjust the channel position to match luminance of given color
			//this.channelPos = 1 - cLab.l / 100;
			//this.drawChannelSelection();

			// change the color div to reflect selection
			d3.select('#pickedColor')
				.style('background-color', c.toString());

			// notify
			if (!skipCallback) {
				for (var i=0; i<this.callbacks.length; i++) {
					var callback = this.callbacks[i];
					if (callback.event == 'pick') {
						callback.callback(c);
					}
				}
			}
			this.renderPerceptual();
			this.markColor(c);
		}
		//this.renderLAB();
		break;
	}
}

ColorPicker.prototype.previewColor = function(c)
{
	if (!c) {
		d3.select("#previewColor").style('background-color', null);
		for (var i=0; i<this.callbacks.length; i++) {
			var callback = this.callbacks[i];
			if (callback.event == 'preview') {
				callback.callback(null);
			}
		}
	}
	else
	{
		var cLab = d3.lab(c);
		if (cLab.displayable()) 
		{
			d3.select("#previewColor").style('background-color', cLab.toString());
			for (var i=0; i<this.callbacks.length; i++) 
			{
				var callback = this.callbacks[i];
				if (callback.event == 'preview') {
					callback.callback(cLab);
				}
			}
		}
		else
		{
			d3.select("#previewColor").style('background-color', null);
		}
	}
}

ColorPicker.prototype.renderPerceptual = function() 
{

	// color ranges (actual LAB ranges are -128, 127)
	var a = this.colorSpace == COLORSPACE_LAB ? A_RANGE : JAB_A_RANGE;
	var b = this.colorSpace == COLORSPACE_LAB ? B_RANGE : JAB_B_RANGE;

	var BACKGROUND = [200, 200, 200];

	var canvas = this.mainCanvas;
	var w = +this.mainCanvas.width;
	var h = +this.mainCanvas.height;

	var context = canvas.getContext("2d");
	var image = context.createImageData(w, h);

	var xScale = d3.scaleLinear().domain([0, w-1]).range(a);
	var yScale = d3.scaleLinear().domain([h-1, 0]).range(b);
	var L = 100 - this.channelPos * 100;

	var I=0, displayables = 0, imageData = image.data;
	for (var r=0; r<h; r++) 
	{
		var B = yScale(r);
		for (var c=0; c<w; c++, I+=4) 
		{
			var A = xScale(c);
			
			// deal with off-gamut d3-cam02 issue
			var offgamut = false;
			if (this.colorSpace == COLORSPACE_CAM02 && L < 40) {
				var limit = 20+(160-20)*(L/40);
				var offLimitC = [w/2-limit, w/2+limit];
				var offLimitR = [h/2+20-limit, h/2+20+limit];
				if  (!(c >= offLimitC[0] && c <= offLimitC[1] &&
					 r >= offLimitR[0] && r <= offLimitR[1]))
				{
					imageData[I]	= BACKGROUND[0];
					imageData[I+1] 	= BACKGROUND[1];
					imageData[I+2]	= BACKGROUND[2];
					imageData[I+3]	= 255;	
					offgamut = true;
					continue;
				}
			}

			var cLAB = this.colorSpace == COLORSPACE_LAB ? d3.lab(L, A, B) : d3.jab(L, A, B);
			if (cLAB.displayable()) 
			{
				var cRGB = d3.rgb(cLAB);

				imageData[I]	= cRGB.r;
				imageData[I+1] 	= cRGB.g;
				imageData[I+2]	= cRGB.b;
				imageData[I+3]	= 255;
				//displayables++;
			}
			else if (!offgamut)
			{
				imageData[I]	= BACKGROUND[0];
				imageData[I+1] 	= BACKGROUND[1];
				imageData[I+2]	= BACKGROUND[2];
				imageData[I+3]	= 255;	
			}
		}
	}

	context.putImageData(image, 0, 0);

}

function getLab(c) {
	if (!isNaN(c.l) && !isNaN(c.a) && !isNaN(c.b)) {
		return c;
	}
	else
	{
		if (!isNaN(c.r) && !isNaN(c.g) && !isNaN(c.b)) {
			// we have an RGB. Convert it to LAB and return
			return d3.lab(d3.rgb(c.r, c.g, c.b));
		}
	}
}
