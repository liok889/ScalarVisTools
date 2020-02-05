function Lineup(w, h, n, realModel, decoyModel)
{
    // total number of exposures (n-1 actual + 1 decoy)
    this.w = w;
    this.h = h;
    this.n = n;

    this.realModel = realModel;
    this.decoyModel = decoyModel;

    // create canvases and samplers
    this.canvases = [];
    this.samplers = [];

    for (var i=0; i<n; i++)
    {
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.id="sample" + i;
        this.canvases.push( canvas );

        // sampler
        var sampler = new ScalarSample(w, h, canvas, i==n-1 ? this.decoyModel : this.realModel);
        this.samplers.push(sampler);
    }
}

Lineup.prototype.sample = function(samplingRate) {
    for (var i=0; i<this.samplers.length; i++)
    {
        this.samplers[i].sampleModel();
        this.samplers[i].vis();
    }
}

Lineup.prototype.layoutCanvases = function(table)
{
    if (!table) {
        table = this.table;
    }
    var randomCanvases = this.canvases.slice();
    var decoyCanvas = randomCanvases.pop();

    // reinsert
    var insertPos = Math.floor( Math.random() * (randomCanvases.length+1) );
    randomCanvases.splice(insertPos, 0, decoyCanvas);


    // remove everything in the table
    table.selectAll('*').remove();
    table.attr('cellpadding', "6").attr("cellspacing", "0")
    // how many rows
    var rows = 2;
    var cols = Math.ceil(this.n/2);

    (function(table, rows, cols, n, randomCanvases)
    {
        var rs = d3.range(rows);
        table.selectAll('tr').data(rs)
            .enter().append('tr')
            .each(function(d, thisRow) {
                (function(rowNum, thisRow) {
                    d3.select(thisRow).selectAll('td').data(d3.range(cols))
                        .enter().append('td').each(function(d, i) {
                            var index = i + rowNum*cols;
                            if (index < n) {
                                this.appendChild( randomCanvases[index] );
                            }
                        });
                })(d, this);
            });
    })(table, rows, cols, this.n, randomCanvases);
    this.table;

}
