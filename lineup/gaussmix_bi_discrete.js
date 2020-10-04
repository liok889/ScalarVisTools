
function DiscreteMap(mapData)
{
	this.width = mapData.width;
	this.height = mapData.height;

	this.pixelMap = mapData.pixelMap;
	this.listOfBins = mapData.listOfBins;
	this.areas = mapData.areas;
	this.minArea = mapData.minArea;
	this.maxArea = mapData.maxArea;

	this.binMap = {};
	this.zeroBinMap();

	// adjust the area for some outliers
	/*
	this.areas[55003] *= Math.pow(2, 5);
	this.areas[26029] *= Math.pow(2, 5);
	this.areas[26061] *= Math.pow(2, 5);
	*/

	// set min area
	/*
	var MIN_AREA = 20;
	
	for (var i=0; i < this.listOfBins.length; i++) 
	{
		var bin = this.listOfBins[i];
		if (this.areas[bin] > 0 && this.areas[bin] < 2)
		{
			//this.areas[bin] = MIN_AREA;
			this.areas[bin] = Math.pow(2, 5);
			this.minArea = Math.min(this.minArea, this.areas[bin]);
			this.maxArea = Math.max(this.maxArea, this.areas[bin]);
		}
	}
	*/
}

DiscreteMap.prototype.zeroBinMap = function() 
{
	var listOfBins = this.listOfBins;
	var binMap = this.binMap;

	for (var i=0, len=listOfBins.length; i<len; i++) 
	{
		var I = listOfBins[i];
		binMap[I] = 0.0;
	}
}

DiscreteMap.prototype.normalize = function()
{
	var listOfBins = this.listOfBins;
	var binMap = this.binMap;
	var maxDensity = 0.0;
	var areaSpan = this.maxArea - this.minArea;

	for (var i=0, len=listOfBins.length; i<len; i++) 
	{
		var I = listOfBins[i];
		var areaRatio = this.areas[I]/this.maxArea;
		//binMap[I] *= Math.pow(1/areaRatio,1/1.3);
		binMap[I] *= 1/Math.pow(this.areas[I], 1/1.2);
		
		//var areaRatio = 1-((this.areas[I]-this.minArea) / areaSpan);

		//var areaRatio = Math.pow((this.areas[I]-this.minArea) / areaSpan,1/2);
		//binMap[I] *= 1/areaRatio;
		maxDensity = Math.max(maxDensity, binMap[I]);
	}

	if (maxDensity > 0) 
	{
		var k = 1 / maxDensity;
		for (var i=0, len=listOfBins.length; i<len; i++) 
		{
			var I = listOfBins[i];
			binMap[I] *= k;
		}
	}
}

DiscreteMap.prototype.plotChoropleth = function(_svg, _colormap)
{
	(function(svg, bins, binMap, pixelMap, colormap) 
	{
		/*
		// test whether the map is correct
		d3.select('#svgChoropleth')
			.on('mousemove', function() {
				var m = d3.mouse(this);
				if (true) {
					var id = pixelMap[m[0] + m[1]*WIDTH];
					if (id)
					{
						d3.select("#c" + id).style('fill', 'white');
					}
				}
			});
		*/

		svg.selectAll('.choroplethBin')
			.each(function() 
			{
				var me = d3.select(this);
				var id = me.attr('id').substr(1);
				var element = binMap[id];
				if (element === null || element === undefined) {
					element = binMap[+id];
				}
				if (element != null && element != undefined) {
					var color = colormap.mapValue(element);
					me.style('fill', color);
				}
				else
				{
					var t=4;
				}
			});
	})(_svg, this.listOfBins, this.binMap, this.pixelMap, _colormap)
}

function GaussMixBiDiscrete(w, h, svg, discreteMap)
{
	GaussMixBivariate.call(this, w, h, svg)
	this.discreteMap = discreteMap;

	// make sure the size of the discreteMap matches up
	// with <w, h>
	if (w != this.discreteMap.width || h != this.discreteMap.height) {
		console.error("Error: sizes of discreteMap and GuassMixDiscrete are not the same.")
	}
}

GaussMixBiDiscrete.prototype = Object.create(GaussMixBivariate.prototype);


GaussMixBiDiscrete.prototype.computeCDFs = function()
{
    var w = this.w;
    var h = this.h;
    var models = this.models;
    var mCount = models.length;
    var pixelMap = this.discreteMap.pixelMap;

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
            if (pixelMap[I] > 0) {

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
        var R = Math.floor(I/w);

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
        
        /*
        var bin = pixelMap[ R*w + C ];
        if (bin > 0) {
        	var p = cdf[R*w + C];
        	view[R*w + C] += p;
        	binMap[bin] += p
        }
        */
    }

    // normalize discrete map / field
    discreteMap.normalize();

    _field.normalize();
    _field.updated();
}


