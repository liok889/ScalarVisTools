function Lineup(w, h, n, realModel, decoyModel, nullOption)
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

    this.nullOption = nullOption;

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

Lineup.prototype.sample = function(samplingRate, noDecoy) 
{
    if (noDecoy) {
        console.log('sampling no decoy (fidelity: ' + samplingRate + ')');
    }
    for (var i=0; i<this.samplers.length; i++)
    {
        this.samplers[i].sampleModel(samplingRate, noDecoy ? this.realModel : undefined);
        this.samplers[i].vis();
    }
}

var LINEUP_PADDING = 6;

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
    table.attr('cellpadding', LINEUP_PADDING).attr("cellspacing", "0")
    // how many rows
    var rows = 2;
    var cols = Math.ceil(this.n/2);

    (function(table, rows, cols, n, randomCanvases, nullOption)
    {
        var rs = d3.range(rows);
        table.selectAll('tr').data(rs)
            .enter().append('tr')
            .each(function(d, thisRow) 
            {
                (function(rowNum, thisRow) 
                {
                    d3.select(thisRow).selectAll('td').data(d3.range(cols))
                        .enter().append('td').each(function(d, i) {
                            var index = i + rowNum*cols;
                            if (index < n) 
                            {
                                this.appendChild( randomCanvases[index] );
                                d3.select(randomCanvases[index])
                                    .attr('class', 'index' + index);
                            }
                        });

                    if (rowNum==0 && nullOption) 
                    {
                        var w_div = +d3.select(randomCanvases[0]).attr('width')
                        var w = 25 + w_div;
                        var h = +d3.select(randomCanvases[0]).attr('height');
                        var tdNull = d3.select(thisRow).append('td')
                            .attr('rowSpan', rows)
                            .attr('width', w);

                        var div = tdNull.append('div')
                            .style('margin', '0 auto')
                            .style('width', w + 'px');
                        div.append('div')
                            .style('margin-top', ((rows*h)/2-h/1) + 'px')
                            .style('margin-left', 'auto')
                            .style('margin-right', 'auto')
                            .attr('class', 'nullOption')
                            .style('text-align', 'center')
                            .style('vertical-align', 'middle')
                            .style('width', w_div + 'px')
                            .style('height', h + 'px')
                            .style('border', 'solid 1px black')
                            .style('font-size', '35px')
                            .style('color', "#bbbbbb")
                            .style('font-weight', 'bold')
                            .html('no discernible difference between images');
                    }
                })(d, this);
            });
    })(table, rows, cols, this.n, randomCanvases, this.nullOption);
    this.table;

}
