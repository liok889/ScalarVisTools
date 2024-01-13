var HIST_H = 50;
var HIST_W = 255;
var HIST_PAD = 15;
var HIST_BINS = 100;

var CELL_SIZE=12;
var SCATTER_W=100;
var SCATTER_H=100;
var SCATTER_PAD=16

var allBrushes = [];

function plotScatter(svg, simulator, accX, accY, subsample, labX, labY)
{
    this.svg = svg;
    this._x = accX;
    this._y = accY;

    var W=SCATTER_W, H=SCATTER_H;
    var R=3; var OPAQ=.07;
    var data = simulator.fieldStats;

    if (subsample) {
        var sub = [];
        for (var i=0; i<data.length; i++) {
            var p = Math.random();
            if (p<subsample) {
                sub.push(data[i])
            }
        }
        data=sub;
    }
    this.data = data;

    minmaxX = [Number.MAX_VALUE, Number.MIN_VALUE];
    minmaxY = [Number.MAX_VALUE, Number.MIN_VALUE];
    this.minmaxX = minmaxX; this.minmaxY = minmaxY;

    for (var i=0; i<data.length; i++)
    {
        var x = accX(data[i]);
        var y = accY(data[i]);
        minmaxX[0] = Math.min(minmaxX[0], x);
        minmaxX[1] = Math.max(minmaxX[1], x);
        minmaxY[0] = Math.min(minmaxY[0], y);
        minmaxY[1] = Math.max(minmaxY[1], y);
    }
    var xScale = d3.scaleLinear()
        .domain(minmaxX).range([0, W]);
    var yScale = d3.scaleLinear()
        .domain(minmaxY).range([H, 0]);

    svg.selectAll('*').remove();
    var rect = svg.append('rect')
        .attr('width', W).attr("height", H)
        .style('fill', 'white')
        .style('stroke', 'black')
        .style('stroke-width', '1px');

    (function(_svg, _data, _xScale, _yScale, _x, _y, _rect, obj)
    {
        var circles = _svg.selectAll('circle').data(_data).enter().append('circle')
            .attr('class', 'scatter')
            .attr('cx', function(d) { return _xScale(_x(d))})
            .attr('cy', function(d) { return _yScale(_y(d))})
            .attr('r', R)
            .style('fill', 'black')
            .style('stroke', 'none')
            .style('opacity', OPAQ)
            .on('mouseover', function(d) {
                d.render();
                d3.select(this)
                    .style('opacity', '1.0')
                    .style('fill', 'red');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('opacity', OPAQ)
                    .style('fill', 'black');

            });

        var brush = d3.brush()
            .extent([[0, 0], [
                +_rect.attr('width'),
                +_rect.attr('height')
            ]]);
        obj.brush = brush;
        allBrushes.push(brush);

        brush.on('brush', function(event)
        {
            if (d3.event.selection)
            {
                var e = d3.event.selection;
                var x0 = _xScale.invert(e[0][0]);
                var x1 = _xScale.invert(e[1][0]);
                var y0 = _yScale.invert(e[0][1]);
                var y1 = _yScale.invert(e[1][1]);


                obj.filter = {
                    x: [Math.min(x0, x1), Math.max(x0, x1)],
                    y: [Math.min(y0, y1), Math.max(y0, y1)]
                };
                obj.filterFunc = (function(filterX, filterY, __x, __y) {
                    return function(d) {
                        var x = __x(d);
                        var y = __y(d);
                        var inFilter =
                            x >= filterX[0] && x <= filterX[1] &&
                            y >= filterY[0] && y <= filterY[1];
                        return inFilter;

                    }
                })(obj.filter.x, obj.filter.y, _x, _y)

                console.log('' + labX + ": " + obj.filter.x[0].toFixed(3) + ", " + obj.filter.x[1].toFixed(3));
                console.log('' + labY + ": " + obj.filter.y[0].toFixed(3) + ", " + obj.filter.y[1].toFixed(3));
                console.log(" ");

                d3.selectAll('circle.scatter').each(function(d) {
                    if (obj.filter) {
                        if (obj.filterFunc(d))
                        {
                            d3.select(this)
                                .style('fill', 'red');
                        }
                        else {
                            d3.select(this)
                                .style('fill', 'black');
                        }
                    }
                });
            }
            else {
                obj.filter = null;
                obj.filterFunc = null;
            }
        })
        /*
        .on('clear', function() {
            obj.filter = null;
            obj.filterFunc = null;
        })
        */

        var g = _svg.append('g')
            .attr('class', 'brushGroup')
            .call(brush);

    })(svg, data, xScale, yScale, accX, accY, rect, simulator);

    if (labX) {
        svg.append('text').html(labX)
            .attr('x', W/2).attr('y', H+10+2)
            .attr('text-anchor', 'middle')
            .style('font-family', 'monospace')
            .style('font-size', '10px');
    }

    if (labY) {
        svg.append('text').html(labY)
            .attr('x', W+2).attr('y', H/2+10/2)
            .style('font-family', 'monospace')
            .style('font-size', '10px');
    }
}

function plotHist(svg, hist, accessor, label)
{
    // compute histogram
    var maxHist = 0;
    for (var i=0; i<hist.length; i++) {
        maxHist = Math.max(maxHist, accessor ? accessor(hist[i]) : hist[i]);
    }

    (function(_svg, _hist, _maxHist, _a, _label)
    {
        _svg.selectAll('rect').remove();
        _svg.selectAll('text').remove();

        if (_label) {
            _svg.append('text')
                .html(_label)
                .attr('text-anchor', 'end')
                .attr('x', HIST_W)
                .attr('y', 12/2 + HIST_H/2)
                .style('font-family', 'monospace')
                .style('font-size', '12px')
        }
        var sel = _svg.selectAll('rect.hist').data(_hist);
        //sel.exit().remove();

        sel = sel.enter().append('rect').merge(sel);
        sel
            .attr('class', 'histRect')
            .attr('x', function(d, i) { return i*(HIST_W/_hist.length);})
            .attr('y', function(d, i) { return HIST_H - (_a(d)/_maxHist)*HIST_H; })
            .attr('height', function(d, i) { return (_a(d)/_maxHist)*HIST_H; })
            .attr('width', function(d, i) { return (HIST_W/_hist.length); });

    })(svg, hist, maxHist, accessor || function(d) { return d; }, label)
}

function plotMatrix(svg, matrix, accessor)
{
    svg.selectAll("*").remove();

    // cell dimensions
    var CELL_D = CELL_SIZE;

    minmax = [Number.MAX_VALUE, Number.MIN_VALUE];
    for (var i=0; i<matrix.length; i++) {
        var row = matrix[i];
        for (var j=0; j<row.length; j++) {
            minmax[0] = Math.min(minmax[0], accessor?accessor(row[j]):row[j]);
            minmax[1] = Math.max(minmax[1], accessor?accessor(row[j]):row[j]);
        }
    }
    console.log("minmax: " + minmax);

    var colormap = getColorPreset('viridis');
    (function(_svg, _matrix, _colormap, _minmax, _acc) {
        _svg.selectAll('g.row').data(_matrix).enter().append('g')
            .attr('class', 'row')
            .attr('transform', function(d,i) {
                return 'translate(0,' + (i*CELL_D) + ')';
            })
            .each(function(row, i) {
                d3.select(this).selectAll('rect').data(row).enter().append('rect')
                    .attr('x', function(d,i) { return i*CELL_D; })
                    .attr('width', CELL_D).attr('height', CELL_D)
                    .style('stroke', 'none')
                    .style('fill', function(d) {
                        var val = _acc?_acc(d):d;
                        var nVal = (val-_minmax[0])/(_minmax[1]-_minmax[0]);
                        console.log('nVal: ' + nVal);
                        var color = colormap.mapValue(nVal);
                        return color;
                    });
            });
    })(svg, matrix, colormap, minmax, accessor);

}

function makeHist(data, bins, accessor, minmax)
{
    if (!minmax) {
        minmax=[0, 1];
    }

    if (!minmax) {
        minmax = [Number.MAX_VALUE, Number.MIN_VALUE];
        for (var i=0; i<data.length; i++) {
            var d = accessor(data[i]);
            if (d>minmax[1]) {
                minmax[1] = d;
            }
            if (d<minmax[0]) {
                minmax[0] = d;
            }
        }
    }

    var L = minmax[1]-minmax[0];
    var B = bins / L;

    var hist = [];
    for (var b=0; b<bins; b++) {
        hist.push({
            x: L*b/bins + minmax[0],
            count: 0,
            members: []
        });
    }



    for (var i=0; i<data.length; i++)
    {
        var d = accessor(data[i]);
        var bin = Math.min(bins-1, Math.floor((d-minmax[0]) * B));
        hist[bin].count++;
        hist[bin].members.push(data[i])
    }
    return hist;
}

function SimInstance(parent, pack)
{
    this.parent = parent;
    if (pack) {
        this.seed = pack.seed;
        this.offset = pack.offset;
        this.scale = pack.scale;
        this.exponent = pack.exponent;
        this.mean = pack.mean;
        this.std = pack.std;
        this.steepness = pack.steepness;
    }
}
SimInstance.prototype.render = function(noTimeout)
{
    if (!parent) {
        console.error("no render parent");
        return;
    }

    (function(me) {
        if (me.parent.regenTimeout !== undefined) {
            clearTimeout(me.parent.regenTimeout);
            me.parent.regenTimeout = undefined;
        }
        if (noTimeout)
        {
            me.parent.noiseEngine.generate(
                me.seed,
                me.offset,
                me.scale,
                me.exponent
            );
            me.parent.noiseEngine.vis();
        }
        else {
            (function(parent, instance) {

                parent.regenTimeout = setTimeout(function() {
                    parent.noiseEngine.generate(
                        instance.seed,
                        instance.offset,
                        instance.scale,
                        instance.exponent
                    );
                    parent.noiseEngine.vis();
                    parent.regenTimeout = undefined;
                }, 5);
            })(me.parent, me)
        }
    })(this);
}
SimInstance.prototype.pack = function() {
    return {
        seed: this.seed,
        offset: this.offset,
        scale: this.scale,
        exponent: this.exponent,
        std: this.std,
        mean: this.mean,
        steepness: this.steepness,
    };
}


function Simulate(noiseEngine, bins, svg)
{
    this.noiseEngine = noiseEngine;
    this.fieldStats = [];

    if (!bins) bins = HIST_BINS;
    this.bins = bins;

    if (!svg) {
        svg = d3.select("#groupSim");
    }


    this.groupMeanHist = svg.select("#groupMeanHist");
    if (this.groupMeanHist.size()==0) {
        this.groupMeanHist = svg.append('g')
            .attr('id', 'groupMeanHist')
            .attr('transform', 'translate(0,' + HIST_PAD + ')');
    }

    this.groupStdHist = svg.select("#groupStdHist");
    if (this.groupStdHist.size()==0) {

        this.groupStdHist = svg.append('g')
            .attr('id', 'groupStdHist')
            .attr('transform', 'translate(0,' + (HIST_H + 2*HIST_PAD) + ')');
    }

    this.groupSteepnessHist = svg.select("#groupSteepnessHist");
    if (this.groupSteepnessHist.size()==0) {

        this.groupSteepnessHist = svg.append('g')
            .attr('id', 'groupSteepnessHist')
            .attr('transform', 'translate(0,' + (2*HIST_H + 3*HIST_PAD) + ')');
    }
}

Simulate.prototype.clearStats = function() {
    this.fieldStats = [];
}

Simulate.prototype.harvest = function(meanRange, stdRange)
{

}
Simulate.prototype.simulate = function(n, skipHist)
{

    var fieldStats = skipHist ? [] : this.fieldStats;
    var lastPrintout = null;
    var scale = this.noiseEngine.getNoiseScale();
    var exponent = this.noiseEngine.getExp();

    for (var i=0; i<n; i++)
    {
        this.noiseEngine.generate();
        var seed = this.noiseEngine.getSeed();
        var offset = this.noiseEngine.getNoiseOffset();

        var field = this.noiseEngine.getField();
        var stats = field.getSubregionStats();


        var instance = new SimInstance(this);
        fieldStats.push(instance);
        instance.seed = seed;
        instance.mean = stats.mean;
        instance.std = stats.std;
        instance.scale = scale;
        instance.steepness = stats.steepness;
        instance.exponent = exponent;
        instance.offset = [offset[0], offset[1]];


        var p = Math.floor(100*i/(n-1));
        if (p%10==0 && p != lastPrintout) {
            lastPrintout = p;
            if (!skipHist) {
                console.log("complete " + p + "%");
            }
        }
    }

    // make histograms
    if (skipHist) {
        return fieldStats;
    }
    else {
        this.meanHist = makeHist(fieldStats, this.bins, function(d) { return d.mean; });
        this.stdHist = makeHist(fieldStats, this.bins, function(d) { return d.std; });
        this.steepnessHist = makeHist(fieldStats, this.bins, function(d) { return d.steepness; });

        plotHist(this.groupMeanHist, this.meanHist, function(d) { return d.count}, 'mean');
        plotHist(this.groupStdHist, this.stdHist, function(d) { return d.count}, 'std');
        plotHist(this.groupSteepnessHist, this.steepnessHist, function(d) { return d.count; }, 'steepness')

        this.addPreview(this.groupMeanHist);
        this.addPreview(this.groupStdHist);
        this.addPreview(this.groupSteepnessHist);
    }
}

Simulate.prototype.getBrushed = function()
{
    var filtered = [];
    var data = this.fieldStats;
    if (this.filterFunc) {
        for (var i=0, len=data.length; i<len; i++) {
            if (this.filterFunc(data[i])) {
                filtered.push(data[i]);
            }
        }
        return filtered;
    }
    else {
        return [];
    }
}

Simulate.prototype.packResults = function()
{
    var filtered = this.getBrushed();
    var data = [];
    for (var i=0; i<filtered.length; i++) {
        var pack = filtered[i].pack();
        pack.i = i;
        data.push(pack);
    }

    function getSortedList(arr, accessor) {
        var sorted = arr.slice();
        sorted.sort(function(a, b) { return accessor(a)-accessor(b); });

        var orderedList = [];
        for (var i=0; i<sorted.length; i++) {
            orderedList.push(sorted[i].i);
        }
        return orderedList;
    }
    function getRange(arr, accessor) {
        var m0 =  Number.MAX_VALUE;
        var m1 = -Number.MAX_VALUE;
        for (var i=0; i<arr.length; i++) {
            m0 = Math.min(m0, accessor(arr[i]));
            m1 = Math.min(m0, accessor(arr[i]));

        }
    }

    // sort by the three parameters
    var stdList = getSortedList(data, function(d) { return d.std; })
    var meanList = getSortedList(data, function(d) { return d.mean; })
    var steepnessList = getSortedList(data, function(d) { return d.steepness; })

    return {
        data: data,
        stdList: stdList,
        meanList: meanList,
        steepnessList: steepnessList,

        stdRange: [data[stdList[0]].std, data[stdList[data.length-1]].std],
        meanRange: [data[meanList[0]].mean, data[meanList[data.length-1]].mean],
        steepnessRange: [data[steepnessList[0]].steepness, data[steepnessList[data.length-1]].steepness],

    }
}
Simulate.prototype.download = function()
{
    var text = JSON.stringify(this.packResults());
    var filename = "simdata.json";
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

var ESTEPS = 25;
var SSTEPS = 25;

Simulate.prototype.simSteps = function(n, _expRange, _scaleRange)
{
    var expW = this.noiseEngine.getExp();
    var ns = this.noiseEngine.getNoiseScale();

    var expRange = _expRange || [expW,expW]; // [0,3];
    var scaleRange = _scaleRange || [ns,ns]; // [2,2]

    for (var s=scaleRange[0]; s<=scaleRange[1]; s+= ((scaleRange[1]-scaleRange[0])/SSTEPS)||1)
    {
        this.noiseEngine.setNoiseScale(s);
        for (var e=expRange[0]; e<=expRange[1]; e+=((expRange[1]-expRange[0])/ESTEPS)||1)
        {
            this.noiseEngine.setExp(e);
            this.simulate(n);

        }
    }
}

function meanStd(arr, accessor) {
    var mean=0, std=0;
    for (var i=0; i<arr.length; i++) {
        mean += accessor ? accessor(arr[i]) : arr[i];
    }
    mean /= arr.length;

    for (var i=0; i<arr.length; i++) {
        std += Math.pow(mean-(accessor ? accessor(arr[i]) : arr[i]), 2);
    }
    std = Math.sqrt(std/arr.length);
    return {
        mean: mean,
        std: std,
        n: arr.length
    };
}
Simulate.prototype.simMatrix = function(n, expRange, scaleRange)
{
    var matrix = [];
    var LEXP = expRange[1]-expRange[0];
    var LSCALE = scaleRange[1]-scaleRange[0];

    for (var i=0, eSteps = 10/*ESTEPS*/; i<eSteps; i++)
    {
        var col = [];
        var eN = i/(eSteps-1);
        this.noiseEngine.setExp(eN * LEXP + expRange[0]);

        for (var j=0, sSteps = 10/*SSTEPS*/; j<sSteps; j++)
        {
            var sN = j/(sSteps-1);
            this.noiseEngine.setNoiseScale(sN * LSCALE + scaleRange[0]);

            var population = this.simulate(n, true);

            var amplitudeStats = meanStd(population, function(d) { return d.mean; });
            var steepnessStats = meanStd(population, function(d) { return d.steepness; });

            col.push({
                amplitudeStats: amplitudeStats,
                steepnessStats: steepnessStats,
                count: population.length, members: population,
                y: LEXP * i/(eSteps-1),
                x: LSCALE * j/(sSteps-1)
            });
        }
        console.log("** overall complete: " + (100*i/(eSteps-1)).toFixed(1) + '%');
        matrix.push(col);
    }
    this.matrix=matrix;

    var svg = d3.select("#svgMatrix");
    svg.selectAll('*').remove();
    var meanG = svg.append("g")
    var steepnessG = svg.append("g")
        .attr('transform', 'translate(' + (this.matrix.length * CELL_SIZE + 15) + ',0)');

    plotMatrix(meanG, matrix, function(d) { return d.amplitudeStats.mean; });
    plotMatrix(steepnessG, matrix, function(d) { return d.steepnessStats.mean; });
}

Simulate.prototype.addPreview = function(histGroup, element)
{
    (function(_histG, obj) {
        _histG.selectAll(element || 'rect.histRect')
            .on('mousemove', function(d)
            {
                var members = d.members;
                if (members.length > 0)
                {
                    // pick a random member
                    var r= Math.random();
                    var I = Math.floor(r * members.length);
                    var instance = members[I];
                    instance.render();
                }
            });
    })(histGroup, this);
}
