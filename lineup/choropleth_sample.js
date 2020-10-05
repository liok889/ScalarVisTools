function ChoroplethSample(w, h, svg, model, colormap)
{
	this.svg = svg;
	this.colormap = colormap;
	ScalarSample.call(this, w, h, null, model, colormap);
}

ChoroplethSample.prototype = Object.create(ScalarSample.prototype);


ChoroplethSample.prototype.vis = function()
{
	if (!this.model) {
		console.error("ChoroplethSample: No model!")
	}
	else if (!this.mode.discreteMap)
	{
		console.error("ChoroplethSample: model has no discrete map!")

	}
	var discreteMap = this.model.discreteMap
	discreteMap.plotChoropleth(this.svg, this.colormap);
}

ChoroplethSample.prototype.setColorMap = function(colormap)
{
	this.colormap = colormap;
}
