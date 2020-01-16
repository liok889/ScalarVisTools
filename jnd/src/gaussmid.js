
// colors
var MODEL_COLORS = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#a65628','#f781bf','#999999'];

// maximum height of a gaussian in the model plot
var P_HEIGHT = 40;

function gauss(x, p) {
    var mue = p[0]
    var delta = p[1];
    var scaler = (p[2] === undefined || p[2] === null) ? 1 : p[2];

    var k = delta * Math.sqrt(2*Math.PI);
    return scaler * (1/k)*Math.exp(-0.5 * Math.pow((x-mue)/delta, 2) );
}

function GaussMix(w, h, svg)
{
    this.w = w;
    this.h = h;
    this.svg = svg;

    this.models = [];
    this.modelMaxX = 0;
    this.modelMaxY = 0;

    this.cdfX = null;
    this.mapX = null;
    this.cdfY = null;
    this.mapY = null;

}

GaussMix.prototype.init = function()
{
    models.push({
        t: gauss,
        param: [WIDTH*.5, WIDTH*.1, 1],
        axis: 'x'
    });


    models.push({
        t: gauss,
        param: [HEIGHT*.5, HEIGHT*.1, 1],
        axis: 'y'
    });
}

GaussMix.prototype.computeCFDs = function()
{
    var w = this.w;
    var h = this.h;

    var X=d3.range(0, w);
    var Y=d3.range(0, h);


    for (var x=0; x<w; x++) {
        X[x]=0;
    }
    for (var y=0; y<h; y++) {
        Y[y]=0;
    }


    // compute probability distribution
    for (var m=0; m < this.models.length; m++)
    {
        var model = this.models[m];
        var outs = model.outputs;

        var len = model.axis == 'x' ? w : h;
        var P = model.axis == 'x' ? X : Y;
        for (var i=0; i<len; i++)
        {
            P[i] += outs[i].y;
        }
    }

    // compute CDFs and normalize
    cdfX=d3.range(0, w);
    cdfY=d3.range(0, h);

    var cumm=0;
    for (var x=0; x<w; x++) {
        cumm+=X[x];
        cdfX[x]=cumm;
    }
    for (var x=0; x<w; x++) {
        cdfX[x] /= cumm;
    }

    var cumm=0;
    for (var y=0; y<h; y++) {
        cumm+=Y[y];
        cdfY[y]=cumm;
    }
    for (var y=0; y<h; y++) {
        cdfY[y] /= cumm;
    }

    // compute a descrete map: this allows us to map from discrete
    // uniform p distribution to the distribution characterized by the above CDFs
    mapX=d3.range(w*MAP_SIZE);
    mapY=d3.range(h*MAP_SIZE);

    for (var x=0, last=0, p=0, len=w*MAP_SIZE, step=1/(w*MAP_SIZE); x<len; x++, p+=step)
    {
        while (cdfX[last] <= p)
        {
            last++;
        }
        mapX[x]=last;
    }

    for (var y=0, last=0, p=0, len=h*MAP_SIZE, step=1/(h*MAP_SIZE); y<len; y++, p+=step)
    {
        while (cdfY[last] < p)
        {
            last++;
        }
        mapY[y]=last;
    }

    this.mapX = mapX;
    this.mapY = mapY;
}

GaussMix.prototype.sampleModel = function(N, _field)
{
    var mapX = this.mapX;
    var mapY = this.mapY;

    var w = this.w;
    var view = _field.view;
    var iterations = N*this.w*this.h;
    for (var i=0; i<iterations; i++)
    {
        var x = Math.min(mapX.length-1, Math.floor(Math.random()*mapX.length));
        var y = Math.min(mapY.length-1, Math.floor(Math.random()*mapY.length));

        var r=mapY[y];
        var c=mapX[x];
        view[ r*w + c ] += 1.0;
    }
    _field.normalize();
    _field.updated();
}

GaussMix.prototype.add = function(axis)
{
    var L = axis == 'x' ? this.w : this.h;

    this.models.push({
        t: gauss,
        param: [L*.5 + (Math.random()-0.5)*L*.2, L*.1 + (Math.random()-0.5)*L*(.1/3), 1],
        axis: axis
    });
}

GaussMix.prototype.updateModel = function()
{
    var modelMaxX = 0;
    var modelMaxY = 0;

    // compute probability density
    var modelOutputs = [];
    for (var m=0; m<this.models.length; m++)
    {
        var model = models[m];
        var points = [];
        if (model.axis == 'x') {
            points = d3.range(0, this.w);
        }
        else if (model.axis == 'y') {
            points = d3.range(0, this.h);
        }

        var maxVal = 0;
        for (var i=0; i<points.length; i++) {
            var p = points[i];
            var out = {
                x: p,
                y: model.t(p, model.param)
            }
            maxVal = Math.max(maxVal, out.y) ;
            points[i] = out;
        }

        model.outputs = points;
        modelOutputs.push(points);

        if (model.axis == 'x')
        {
            modelMaxX = Math.max(modelMaxX, maxVal);
        }
        else {
            modelMaxY = Math.max(modelMaxY, maxVal);
        }
    }

    // compute CDFs and maps
    computeCFDs();

    //var yScale = d3.scaleLinear().domain([0, modelMax]).range([0, -P_HEIGHT]);

    // plot distribution
    var lineGeneratorX = d3.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return -P_HEIGHT * (d.y/modelMaxX); });

    var lineGeneratorY = d3.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return -P_HEIGHT * (d.y/modelMaxY); });

    var paths = d3.select("#models").selectAll('path').data(models)

    paths.exit().remove();
    var enter = paths.enter().append('path');
    paths = paths.merge(enter);
    paths
        .attr('d', function(d) {
            return d.axis=='x' ? lineGeneratorX(d.outputs) : lineGeneratorY(d.outputs)
        })
        .attr('class', 'modelPath')
        .attr('stroke', function(d, i) {
            return MODEL_COLORS[Math.min(i, MODEL_COLORS.length-1)];
        })
        .attr('transform', function(d)
        {
            if (d.axis == 'y') {
                return 'translate(' + WIDTH + ',0) ,rotate(90)';
            }
            else {
                return null;
            }
        })
        .on('mousedown', function(d) {
            mouseCoord = d3.mouse(d3.select("#models").node());
            (function(model, oldDelta, oldScaler, mouseCoord) {
                d3.select(document).on('mousemove.moveDist', function() {

                    var dMove, dScaler, mouse = d3.mouse(d3.select("#models").node());
                    if (model.axis=='x')
                    {
                        dMove = mouse[0] - mouseCoord[0];
                        dScaler = -(mouse[1] - mouseCoord[1]);
                    }
                    else {
                        dMove = mouse[1] - mouseCoord[1];
                        dScaler = mouse[0] - mouseCoord[0];
                    }

                    var newDelta = oldDelta + dMove;
                    newDelta = Math.max(1, newDelta);
                    newDelta = Math.min(model.axis=='x' ? WIDTH-1 : HEIGHT-1, newDelta);

                    newScaler = oldScaler + dScaler/P_HEIGHT;
                    model.param[1] = newDelta;
                    model.param[2] = Math.max(0.05, newScaler);

                    plotModels();

                });

                d3.select(document).on('mouseup.moveDist', function() {
                    drawModel();
                    d3.select(document).on('mousemove.moveDist', null)
                    d3.select(document).on('mouseup.moveDist', null)

                })
            })(d, d.param[1], d.param[2], mouseCoord)
        });


    // plot model center
    var lines = d3.select("#models").selectAll('line').data(models)
    lines.exit().remove();
    enter = lines.enter().append('line');
    lines = lines.merge(enter);
    lines
        .attr('x1', function(d) {
            return d.axis=='x' ? d.param[0] : -1 * (-P_HEIGHT * d.t(d.param[0], d.param)/modelMaxY);
        })
        .attr('x2', function(d) { return d.axis=='x' ? d.param[0] : 0; })
        .attr('y1', function(d) { return d.axis=='x' ? (-P_HEIGHT * d.t(d.param[0], d.param)/modelMaxX) : d.param[0]})
        .attr('y2', function(d) { return d.axis=='x' ? 0 : d.param[0] })
        .attr('stroke', 'black')
        .attr('transform', function(d)
        {
            if (d.axis == 'y') {
                return 'translate(' + WIDTH + ',0)';
            }
            else {
                return null;
            }
        })
        .attr('stroke', function(d, i) {
            return MODEL_COLORS[Math.min(i, MODEL_COLORS.length-1)];
        })
        .style('stroke-width', '3px')
        .on('mousedown', function(d) {
            mouseCoord = d3.mouse(d3.select("#models").node());
            (function(model, oldMue, oldScaler, mouseCoord) {
                d3.select(document).on('mousemove.moveLine', function() {

                    var dMove=0, dScaler=0, mouse = d3.mouse(d3.select("#models").node());
                    if (model.axis=='x')
                    {
                        dMove = mouse[0] - mouseCoord[0];
                        //dScaler = -(mouse[1] - mouseCoord[1]);
                    }
                    else {
                        dMove = mouse[1] - mouseCoord[1];
                        //dScaler = mouse[0] - mouseCoord[0];
                    }

                    var newMue = oldMue + dMove;
                    newMue = Math.max(0, newMue);
                    newMue = Math.min(model.axis=='x' ? WIDTH-1 : HEIGHT-1, newMue);

                    newScaler = oldScaler + dScaler/P_HEIGHT;
                    model.param[0] = newMue;
                    model.param[2] = Math.max(0.05, newScaler);

                    plotModels();

                });

                d3.select(document).on('mouseup.moveLine', function() {
                    drawModel();
                    d3.select(document).on('mousemove.moveLine', null)
                    d3.select(document).on('mouseup.moveLine', null)

                })
            })(d, d.param[0], d.param[2], mouseCoord)

        })


}
