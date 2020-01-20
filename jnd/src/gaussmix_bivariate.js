var BI_MAP_SIZE=10;

function GaussMixBivariate(w, h, svg)
{
    GaussMix.call(this, w, h, svg);
    this.cdf = new ScalarField(w, h);
    this.cdfMap = new Float32Array(new ArrayBuffer(4 * w * h * BI_MAP_SIZE * BI_MAP_SIZE));
}

function biGauss(mX, mY, sX, sY, rho, scaler)
{
    this.mX = mX;
    this.mY = mY;
    this.sX = sX;
    this.sY = sY;
    this.updateRho(rho);
    this.scaler = (scaler ? scaler : 1);

}

biGauss.prototype.updateRho = function(_rho)
{
    // rescale row so that it's between -.7 and .7
    this.rho = _rho * .7;
    this.rho2 = this.rho * this.rho;
    this.rhoExpConst = -1/(2 * (1-this.rho2));
    this.rhoSqrConst =  1/(2 * Math.PI * Math.sqrt(1-this.rho2));
}

biGauss.prototype.eval = function(x, y)
{
    var stX = (x-this.mX)/this.sX;
    var stY = (y-this.mY)/this.sY;
    var stXY = stX * stY;

    var e = this.rhoExpConst * (stX*stX -2 * this.rho * stXY + stY*stY);
    var a = this.rhoSqrConst * (1/(this.sX * this.sY))

    return a * Math.exp( e );
}

GaussMixBivariate.prototype = new GaussMix();
GaussMixBivariate.prototype.constructor = GaussMixBivariate;

GaussMixBivariate.prototype.init = function()
{
    this.models = [];

    // add a few random gausses
    for (var i=0, count=1+Math.floor(.499 + Math.random()*3); i<count; i++ ) {
        this.add();
    }
    this.updateModel();
}
GaussMixBivariate.prototype.copyTo = function(newModel, dontUpdate)
{
    if (!newModel) {
        newModel = new GaussMixBivariate(this.w, this.h, null);
    }
    else {
        newModel.w = this.w;
        newModel.h = this.h;
    }

    newModel.models = [];
    for (var i=0; i<this.models.length; i++) {
        var m = this.models[i];
        newModel.models.push(
            new biGauss(m.mX, m.mY, m.sX, m.sY, m.rho, m.scaler)
        );
    }
    if (!dontUpdate) {
        newModel.updateModel();
    }
    return newModel;
}

var MIN_SIGMA = 10;

GaussMixBivariate.prototype.add = function()
{
    // center
    var mX = this.w/2 + (Math.random()*2-1) * (this.w*0.4);
    var mY = this.h/2 + (Math.random()*2-1) * (this.h*0.4);

    // standard deviation
    var sigmaX = (Math.random()*.8 + .2) * this.w * .3;
    var sigmaY = (Math.random()*.8 + .2) * this.h * .3;
    var scaler = 0.7  + (Math.random()*2 - 1)*0.3;
    var rho = Math.random()*2-1;

    this.models.push(new biGauss(mX, mY, sigmaX, sigmaY, rho, scaler));
    this.updateModel();

}

GaussMixBivariate.prototype.remove = function() {
    if (this.models.length < 1) {
        return;
    }
    else {
        this.models.splice(this.models.length-1, 1);
        this.updateModel();
    }
}

GaussMixBivariate.prototype.randomPerturb = function()
{

}

GaussMixBivariate.prototype.plotModelCurves = function()
{
    var ellipses = this.svg.selectAll('ellipse').data(this.models)
    ellipses.exit().remove();

    var enter = ellipses.enter().append('ellipse')
        .attr('class', 'modelEllipse');
    ellipses = ellipses.merge(enter);
    ellipses
        //.attr('cx', function(d) { return d.mX; })
        //.attr('cy', function(d) { return d.mY; })
        .attr('transform', function(d) {
            var rotation = 'rotate(' + -Math.PI*.25*d.rho * 180.0/Math.PI + ')';
            var translation = 'translate(' + d.mX + ',' + d.mY + ')';
            return translation + ' ' + rotation;
        })
        .attr('rx', function(d) { return d.sX; })
        .attr('ry', function(d) { return d.sY; })
        .style('stroke-width', '3px')
        .attr('stroke', function(d, i) {
            return MODEL_COLORS[Math.min(i, MODEL_COLORS.length-1)];
        })
        .attr('fill', 'none');

    var lines = this.svg.selectAll('line').data(this.models)
    lines.exit().remove();
    enter = lines.enter().append('line');
    lines = lines.merge(enter);
    lines
        .attr('stroke', function(d, i) {
            return MODEL_COLORS[Math.min(i, MODEL_COLORS.length-1)];
        })
        .style('stroke-width', '3px')
        .attr('x1', function(d) { return d.mX+3*Math.cos( Math.PI*.25*d.rho ); })
        .attr('y1', function(d) { return d.mY-3*Math.sin( Math.PI*.25*d.rho ); })
        .each(function(d) {
            // slop based on rho
            var len = d.sX;

            var x2 = d.mX + len * Math.cos( Math.PI*.25*d.rho );
            var y2 = d.mY - len * Math.sin( Math.PI*.25*d.rho );

            d3.select(this)
                .attr('x2', x2).attr('y2', y2)
        });

    // plots centers
    var centers = this.svg.selectAll('circle.center').data(this.models)
    centers.exit().remove();
    enter = centers.enter().append('circle')
        .attr('class', 'center');
    centers = centers.merge(enter);
    centers
        .attr('cx', function(d) { return d.mX; })
        .attr('cy', function(d) { return d.mY; })
        .attr('fill', function(d, i) {
            return MODEL_COLORS[Math.min(i, MODEL_COLORS.length-1)];
        })
        .attr('r', 3);

    // event handlers
    (function(me, centers, ellipses) {
        centers.on('mousedown', function(biG)
        {
            me.mouseCoord = d3.mouse(me.svg.node());
            me.oldMX = biG.mX;
            me.oldMY = biG.mY;
            d3.select(document)
                .on('mousemove.moveCenter', function()
                {
                    var mouse = d3.mouse(me.svg.node());
                    var dMouse = [
                        mouse[0]-me.mouseCoord[0],
                        mouse[1]-me.mouseCoord[1]
                    ];
                    biG.mX = me.oldMX + dMouse[0];
                    biG.mY = me.oldMY + dMouse[1];
                    me.updateModel();
                })
                .on('mouseup.moveCenter', function() {
                    me.fireCallbacks();
                    d3.select(document)
                        .on('mousemove.moveCenter', null)
                        .on('mouseup.moveCenter', null);
                });
        });

        ellipses.on('mousedown', function(biG)
        {
            me.mouseCoord = d3.mouse(me.svg.node());
            me.oldSX = biG.sX;
            me.oldSY = biG.sY;
            d3.select(document)
                .on('mousemove.moveCenter', function()
                {
                    var mouse = d3.mouse(me.svg.node());
                    var dMouse = [
                        mouse[0]-me.mouseCoord[0],
                        mouse[1]-me.mouseCoord[1]
                    ];
                    biG.sX = Math.max(MIN_SIGMA, me.oldSX + dMouse[0]);
                    biG.sY = Math.max(MIN_SIGMA, me.oldSY + dMouse[1]);
                    me.updateModel();
                })
                .on('mouseup.moveCenter', function() {
                    me.fireCallbacks();
                    d3.select(document)
                        .on('mousemove.moveCenter', null)
                        .on('mouseup.moveCenter', null);
                });
        });

        lines.on('mousedown', function(BiG)
        {
            me.mouseCoord = d3.mouse(me.svg.node());
            d3.select(document)
                .on('mousemove.moveCenter', function()
                {
                    // compute new rho based on slope created by line
                    // passing through model center and new mouse coordinates
                    var mouse = d3.mouse(me.svg.node());
                    var slope = (mouse[1]-BiG.mY)/(mouse[0]-BiG.mX);
                    if (slope > 1) {
                        slope=1;
                    }
                    else if (slope < -1) {
                        slope=-1;
                    }
                    BiG.updateRho(slope*-1);
                    me.updateModel();
                })
                .on('mouseup.moveCenter', function() {
                    me.fireCallbacks();
                    d3.select(document)
                        .on('mousemove.moveCenter', null)
                        .on('mouseup.moveCenter', null);
                });
        });

    })(this, centers, ellipses);
}

GaussMixBivariate.prototype.updateModel = function()
{
    // compute CDFs and maps
    this.computeCDFs();

    this.plotModelCurves();
}


GaussMixBivariate.prototype.computeCDFs = function()
{
    var w = this.w;
    var h = this.h;
    var models = this.models;
    var mCount = models.length;


    // clear out old PDF
    this.cdf.zero();
    var cdf = this.cdf.view;

    // loop through all pixels
    var cummP = 0;
    for (var r=0, I=0; r<h; r++)
    {
        for (var c=0; c<w; c++, I++)
        {
            // evaluate density of all models
            var P=0;
            for (var m=0; m<mCount; m++)
            {
                var model = models[m];
                P += model.eval(c, r);
            }
            cummP += P;
            cdf[I] = cummP;
        }
    }

    // CDF
    var cdfMap = this.cdfMap;
    var cdfLen = this.cdfMap.length;

    for (var i=0, last=0, p=0, step=cummP/cdfLen; i<cdfLen; i++, p+=step)
    {
        while (cdf[last] < p)
        {
            last++;
        }
        cdfMap[i]=last;
    }
}

GaussMixBivariate.prototype.sampleModel = function(iterations, _field)
{
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

    // reset scalar field with zeros
    _field.zero();
    var view = _field.view;

    // iterate
    for (var i=0; i<iterations; i++)
    {
        // find center of splat
        var I = cdfMap[ Math.min(cdfLen-1, Math.floor(Math.random()*cdfLen)) ];

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
                view[ r*w + c ] += splat[k] * cummP;
            }
        }

        //view[ R*w + C ] += 1.0;
    }
    _field.normalize();
    _field.updated();
}
