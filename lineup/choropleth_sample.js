//BI_MAP_SIZE=1;
//CALLBACK_SAMPLE = false;

function ChoroplethSampler(w, h, svg, model, colormap)
{
	this.svg = svg;
	this.colormap = colormap;
	
	this.w = w;
    this.h = h;
    this.field = null;
    this.model = model;

    // add myself to the model
    if (model) {
        this.setModel(model);
    }

    ALL_SAMPLERS.push(this);
}

ChoroplethSampler.prototype = Object.create(ScalarSample.prototype);


ChoroplethSampler.prototype.vis = function()
{
	if (!this.model) {
		console.error("ChoroplethSample: No model!")
	}
	else if (!this.model.discreteMap)
	{
		console.error("ChoroplethSample: model has no discrete map!")

	}
	var discreteMap = this.model.discreteMap
	discreteMap.colorChoropleth(this.svg, this.colormap);
}

ChoroplethSampler.prototype.setColorMap = function(colormap)
{
	this.colormap = colormap;
}
