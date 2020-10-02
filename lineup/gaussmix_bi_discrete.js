
function DiscreteMap(mapData)
{
	this.width = mapData.width;
	this.height = mapData.height;

	this.pixelMap = mapData.pixelMap;
	this.listOfBins = mapData.listOfBins;

	this.binMap = {};
	for (var i=0; i<this.listOfBins.length; i++) 
	{
		this.binMap[i] = 0.0;
	}
}

DiscreteMap.prototype.zeroBinMap = function() 
{
	var listOfBins = this.listOfBins;
	var binMap = this.binMap;

	for (var i=0, len=listOfBins.length; i<len; i++) 
	{
		binMap[i] = 0.0;
	}
}

DiscreteMap.prototype.normalize = function()
{
	var listOfBins = this.listOfBins;
	var binMap = this.binMap;
	var maxDensity = 0.0;

	for (var i=0, len=listOfBins.length; i<len; i++) 
	{
		maxDensity = Math.max(maxDensity, binMap[i]);
	}

	if (maxDensity > 0) 
	{
		var k = 1/maxDensity;
		for (var i=0, len=listOfBins.length; i<len; i++) 
		{
			binMap[i] * k;
		}
	}
}

function GaussMixBiDiscrete(w, h, svg, discreteMap)
{
	GaussMixBivariate.call(w, h, svg)
	this.discreteMap = discreteMap;

	// make sure the size of the discreteMap matches up
	// with <w, h>
	if (w != this.discreteMap.width || h != this.discreteMap.height) {
		console.error("Error: sizes of discreteMap and GuassMixDiscrete are not the same.")
	}
}


GaussMixBiDiscrete.prototype.computeCDFs = function()
{
    var w = this.w;
    var h = this.h;
    var models = this.models;
    var mCount = models.length;
    var theMap = this.discreteMap.theMap;

    // compute PDF / CDF
    var cummDensity = 0, maxDensity = 0, minDensity=Number.MAX_VALUE;

    // clear out
    this.pdf.zero();
    this.cdf.zero();

    var pdf = this.pdf.view;
    var cdf = this.cdf.view;

    // loop through all rows / columns
    for (var r=0, I=0; r<h; r++)
    {
        for (var c=0; c<w; c++, I++)
        {

            // evaluate density of all models
            var P=0;
            if (theMap[I] > 0) {

	            for (var m=0; m<mCount; m++)
	            {
	                var model = models[m];
	                P += model.eval(c, r);
	            }
	            // To force a uniform distribution (for testing):
	            //P = Math.random();//1/(w*h);

	            if (P > maxDensity) {
	                maxDensity = P;
	            }
	            if (P < minDensity) {
	                minDensity = P;
	            }
	        }

            cummDensity += P;
            pdf[I] = P;
            cdf[I] = cummDensity;
        }
    }

    this.maxDensity = maxDensity;
    this.minDensity = minDensity;
    this.cummDensity = cummDensity;

    // construct map
    this.updateCDFMap = true;
}

GaussMixBiDiscrete.prototype.sampleModel = function(iterations, _field)
{
    if (this.updateCDFMap) {
        this.computeCDFMap();
    }

    var SPLAT_AREA=(SPLAT_SIZE*2+1)*(SPLAT_SIZE*2+1);
    var splat = [];
    for (var j=0;j<SPLAT_AREA; j++) {
        splat.push(0);
    }

    var w = this.w;
    var h = this.h;
    var w_1 = w-1;
    var h_1 = h-1;

    var cdf = this.cdf.view;
    var cdfMap = this.cdfMap;
    var cdfLen = cdfMap.length;

    // reset the discrete map
    var discreteMap = this.discreteMap;
    discreteMap.zeroBinMap();
    var binMap = discreteMap.binMap;
    var pixelMap = discreteMap.pixelMap;


    // reset scalar field with zeros
    _field.zero();
    var view = _field.view;

    // iterate
    for (var i=0; i<iterations; i++)
    {
        // find center of splat
        var I = cdfMap[ Math.floor(Math.random() * cdfLen) ];

        // convert to row, column coordinate
        var C = I % w;
        var R = Math.floor(I/h);

        // find splat boundary

        var R0 = Math.max(0, R-SPLAT_SIZE), R1 = Math.min(h_1, R+SPLAT_SIZE);
        var C0 = Math.max(0, C-SPLAT_SIZE), C1 = Math.min(w_1, C+SPLAT_SIZE);
        var cummP=0;

        // compute total density at this splat
        for (var k=0, r=R0; r<=R1; r++)
        {
            for (var c=C0; c<=C1; c++, k++)
            {
                var p = cdf[r*w + c];
                splat[k] = p;
                cummP += p;
            }
        }
        cummP = 1/cummP;

        // distribute density throughout the splat according to the PDF
        for (var k=0, r=R0; r<=R1; r++)
        {
            for (var c=C0; c<=C1; c++, k++)
            {
            	var P = r*w + c;
            	var bin = pixelMap[ P ];
            	if (bin > 0)
            	{
            		var s = splat[k] * cummP
                	view[ P ] += s;
                	binMap[ bin ] += s;
                }
            }
        }

    }

    // normalize discrete map / field
    discreteMap.normalize();

    _field.normalize();
    _field.updated();
}


