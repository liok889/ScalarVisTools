

var COLORSPACE_LAB = 1;
var COLORSPACE_RGB = 2;

var A_RANGE=[-115, 115];
var B_RANGE=[-115, 115];

var CHANNEL_RAMP_OFFSET = 10;

function ColorPicker(mainCanvas, channelCanvas) 
{
	this.mainCanvas = mainCanvas;
	this.channelCanvas = channelCanvas;

	// default to using CIE LAB color space
	this.colorSpace = COLORSPACE_LAB;

	// location of current selection on the channel
	// this should be a normalized number between 0 and 1
	this.channelPos = 0.5;
	this.renderChannel();
	this.armEvents();
	this.renderLAB();

	this.currentColor = null;

	// callbacks, initially empty 
	this.callbacks = [];
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

	case COLORSPACE_LAB:

		// luminance interpolation
		for (var i=0; i<height; i++)
		{
			var cLAB = d3.lab(100-100*i/(height-1), 0.0, 0.0);
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

	case COLORSPACE_RGB:

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

ColorPicker.prototype.renderLAB = function() 
{

	// draw all possible lab colors
	var context = this.mainCanvas.getContext("2d");
	var height = this.mainCanvas.height;
	var width = this.mainCanvas.width;	
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
					case COLORSPACE_LAB:
						picker.renderLAB();
						break;
					}
				})
				.on("mouseup.channelPicker", function() {
					d3.select(document)
						.on("mousemove.channelPicker", null)
						.on("mouseup.channelPicker", null);
				})

		})

		d3.select(picker.mainCanvas)
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
				var c = picker.colorFromMouse(d3.mouse(this));
				picker.pickColor(c);
				picker.mouseDown = true;
			})
			.on('mouseup', function() {
				picker.mouseDown = false;
			});
	})(this);
}

ColorPicker.prototype.colorFromMouse = function(mouse) 
{
	var canvas = this.mainCanvas;
	var w = +this.mainCanvas.width;
	var h = +this.mainCanvas.height;

	switch (this.colorSpace)
	{
	case COLORSPACE_LAB:
		var xScale = d3.scaleLinear().domain([0, w-1]).range(A_RANGE);
		var yScale = d3.scaleLinear().domain([h-1, 0]).range(B_RANGE);			
		var B = yScale(mouse[1])
		var A = xScale(mouse[0]);
		return d3.lab((1-this.channelPos)*100, A, B);
		break;
	}

}

ColorPicker.prototype.switchToColor = function(c)
{
	switch (this.colorSpace)
	{
	case COLORSPACE_LAB:

		var cLab = d3.lab(c);
		if (!cLab.displayable()) {
			console.log("\tNon-displayable");
		}
		else
		{
			// adjust the channel position to match luminance of given color
			this.channelPos = 1 - cLab.l / 100;
			this.drawChannelSelection();	

			// change the color div to reflect selection
			d3.select('#pickedColor')
				.style('background-color', c.toString());
			this.renderLAB();
			this.markColor(c);
		}

		break;
	}
}

ColorPicker.prototype.markColor = function(c) 
{
	// draw a simple cross sign
	var aS = d3.scaleLinear().domain(A_RANGE).range([0, this.mainCanvas.width]);
	var bS = d3.scaleLinear().domain(B_RANGE).range([this.mainCanvas.height, 0]);
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
			this.renderLAB();
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

ColorPicker.prototype.renderLAB = function() 
{

	// color ranges (actual LAB ranges are -128, 127)
	var a = A_RANGE;
	var b = B_RANGE;
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
			var cLAB = d3.lab(L, A, B);
			if (cLAB.displayable()) 
			{
				var cRGB = d3.rgb(cLAB);

				imageData[I]	= cRGB.r;
				imageData[I+1] 	= cRGB.g;
				imageData[I+2]	= cRGB.b;
				imageData[I+3]	= 255;
				//displayables++;
			}
			else
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
