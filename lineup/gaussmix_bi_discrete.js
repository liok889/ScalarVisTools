var globalMapData = null;
var USE_GLOBAL_MAP_DATA = true;
var ENABLE_SPLAT = true;
var HIST_EQUALIZE = true;

function matrixFromArray(arr)
{
	var matrixSize = arr.length * Int32Array.BYTES_PER_ELEMENT;
	var matrix = new Int32Array(new ArrayBuffer(matrixSize));
	for (var i=0, len=arr.length; i<len; i++) {
		matrix[i] = arr[i];
	}
	return matrix;
}

function loadGlobalMapData(mapData)
{
	globalMapData = 
	{
		pixelMap: mapData.pixelMap,
		listOfBins: mapData.listOfBins,
		areas: mapData.areas,
		minArea: mapData.minArea,
		maxArea: mapData.maxArea,
		width: mapData.width,
		height: mapData.height
	}
}

function DiscreteMap(mapData)
{
	if (USE_GLOBAL_MAP_DATA && globalMapData)
	{
		this.width = globalMapData.width;
		this.height = globalMapData.height;

		this.pixelMap = globalMapData.pixelMap;
		this.listOfBins = globalMapData.listOfBins;
		this.areas = globalMapData.areas;
		this.minArea = globalMapData.minArea;
		this.maxArea = globalMapData.maxArea;
	}
	else if (mapData)
	{
		this.width = mapData.width;
		this.height = mapData.height;

		this.pixelMap = matrixFromArray(mapData.pixelMap);
		this.listOfBins = mapData.listOfBins;
		this.areas = mapData.areas;

		// scan to determine mim/max area
		this.minArea = Number.MAX_VALUE;
		this.maxArea = Number.MIN_VALUE;

		for (var i=0; i< this.listOfBins.length; i++)
		{
			var bin = this.listOfBins[i]
			var a = this.areas[bin];
			if (a > 0) 
			{
				this.minArea = Math.min(a, this.minArea);
				this.maxArea = Math.max(a, this.maxArea);
			}
		}

		if (USE_GLOBAL_MAP_DATA) 
		{
			loadGlobalMapData(mapData);
		}
	}
	else
	{
		console.log("error: no map data provided");
	}
	
	this.binMap = {};
	this.zeroBinMap();

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
	this.lowCutoff = 0.0;
	this.highCutoff = 1.0;

	var listOfBins = this.listOfBins;
	var binMap = this.binMap;
	var maxDensity = 0.0;
	var areas = this.areas;

	for (var i=0, len=listOfBins.length; i<len; i++) 
	{
		var I = listOfBins[i];

		//binMap[I] *= 1/Math.pow(this.areas[I], 1);
		binMap[I] *= 1/areas[I];
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

	if (HIST_EQUALIZE) {
		this.percentileCutoff();
	}
}

DiscreteMap.prototype.percentileCutoff = function()
{
	var CUTOFF_PERCENT_LOW = .01/4;
	var CUTOFF_PERCENT_HIGH = 1-0.01/4;

	var histogram = [];
	var listOfBins = this.listOfBins;
	var binMap = this.binMap;

	for (var i=0, len=listOfBins.length; i<len; i++) 
	{
		var bin = listOfBins[i];
		histogram.push({bin: bin, v: binMap[bin]});
	}

	histogram.sort(function(a, b) { return a.v-b.v; });
	
	var L = Math.max(
		0, 
		Math.ceil(histogram.length * CUTOFF_PERCENT_LOW)
	);

	var H = Math.min(
		histogram.length-1, 
		Math.floor(histogram.length * CUTOFF_PERCENT_HIGH)
	);

	this.histogram = histogram;
	this.lowCutoff = histogram[L].v;
	this.highCutoff = histogram[H].v;
}

DiscreteMap.prototype.plotChoropleth = function(_svg, colormap)
{
	(function(svg, binMap, L, H) 
	{
		if (svg.selectAll === undefined) {
			svg = d3.select(svg);
		}
		
		svg.selectAll('.choroplethBin')
			.each(function(d) 
			{
				var me = d3.select(this);
				var id = d.id;
				var value = binMap[id];
				if (value === null || value === undefined) {
					value = binMap[+id];
				}

				if (value != null && value != undefined) 
				{
					value = Math.max(Math.min(H, value), L);
					var nValue = (value-L) / (H-L);
					var color = colormap.mapValue(nValue);
					me.style('fill', color);
				}
			});
	})(_svg, this.binMap, this.lowCutoff, this.highCutoff)
}

function GaussMixBiDiscrete(w, h, svg, dMapData)
{
	console.log('BiDiscreteModel constructor');
	this.discreteMap = new DiscreteMap(dMapData);

	GaussMixBivariate.call(this, w, h, svg)

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
    var pixelMap = this.discreteMap.pixelMap;
    var pdf = this.pdf.view;

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
    //_field.zeroLeaveEmpty();
    var view = _field ? _field.view : null;
    
    if (_field)
    {
	    if (!_field.emptyMarked) 
	    {
	    	var empty = SCALAR_EMPTY;
		    for (var i=0, len=view.length; i<len; i++) 
		    {
		    	if (pixelMap[i] == 0) 
		    	{
		    		view[i] = empty;
		    	}
		    	else
		    	{
		    		view[i] = 0.0;
		    	}
		    }
		    _field.emptyMarked = true;
		}
		else
		{
			_field.zeroLeaveEmpty();
		}
	}

    // iterate
    for (var i=0; i<iterations; i++)
    {
        // find center of splat
        var I = cdfMap[ Math.floor(Math.random() * cdfLen) ];

        // convert to row, column coordinate
        //var C = I % w;
        var R = Math.floor(I/w);
        var C = I- R*w;

        // SPLAT
        // =====
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
                	if (view) {
                		view[ P ] += s;
                	}
                	binMap[ bin ] += s;
                }
            }
        }
        
        
        /*
        // OR one hit, as opposed to a splat
        // =================================
        var K = R*w + C;
        var bin = pixelMap[ K ];
        if (bin > 0) {
        	//var p = cdf[R*w + C];
        	view[K] += 1;
        	binMap[bin] += 1;
        }
        */
        
        
    }

    // normalize discrete map / field
    discreteMap.normalize();

    if (_field) {
    	_field.normalize();
    	_field.updated();
    }
}



