
var dashboardHeight = 6000;
var dashboardWidth = 700;

c3.load("c3_data.json");
init();

// Display a ramp
var svg = d3.select("body").append("svg")
  .attr("height", dashboardHeight+25)
  .attr("width", dashboardWidth+40);

var OPTIONS = ["L Length", "L Variance", "C Length", "C Variance", "H Length", "H Variance", "LAB Length", "LAB Variance", "Name Length", "Name Variance"];

for (var i = 0; i < OPTIONS.length; ++i) {
  var option = document.createElement("option");
    option.value = OPTIONS[i];
    option.text = OPTIONS[i];
    $("#mode-select").append(option);
}

// Open the document
d3.csv("./interpolated_hex_ramps.csv", function(data) {
  data.forEach(function(d, i){
    d.colors = [d3.rgb(d.C1), d3.rgb(d.C2), d3.rgb(d.C3), d3.rgb(d.C4), d3.rgb(d.C5), d3.rgb(d.C6), d3.rgb(d.C7), d3.rgb(d.C8), d3.rgb(d.C9)];
  });


  $("#mode-select").change(function(){
    console.log("get here");
  //console.log("Displaying " + $("#mode-select").prop('selectedIndex'))
    //displayRamp(data[$("#mode-select").prop('selectedIndex')]);
    // Sort the data
    var property =$("#mode-select option:selected").text();
    console.log(property)
    sortData(property, data);
    svg.selectAll("text").remove();

    // Display the data
    for (var i = 0; i < data.length; i++)
      displayRamp(property, data, i);
  });
  // Display the data
  svg.selectAll("text").remove();
  sortData("L Length", data)
  for (var i = 0; i < data.length; i++)
    displayRamp("L Length", data, i);
})

function sortData(property, data){
  switch(property) {
  case "L Length":
    data.sort(function(a, b) {
      console.log(getLLength(a));
      return getLLength(a) - getLLength(b);
    });
    break;
  case "L Variance":
    data = data.sort(function(a, b) {
      return getLVariance(a) - getLVariance(b);
    });
    break;
  case "C Length":
    data = data.sort(function(a, b) {
      return getCLength(a) - getCLength(b);
    });
    break;
  case "C Variance":
    data = data.sort(function(a, b) {
      return getCVariance(a) - getCVariance(b);
    });
    break;
  case "H Length":
    data = data.sort(function(a, b) {
      return getHLength(a) - getHLength(b);
    });
    break;
  case "H Variance":
    data = data.sort(function(a, b) {
      return getHVariance(a) - getHVariance(b);
    });
    break;
  case "LAB Length":
    data = data.sort(function(a, b) {
      return getLABLength(a) - getLABLength(b);
    });
    break;
  case "LAB Variance":
    data = data.sort(function(a, b) {
      return getLABVariance(a) - getLABVariance(b);
    });
    break;
  case "Name Length":
    data = data.sort(function(a, b) {
      return getNameLength(a) - getNameLength(b);
    });
    break;
  case "Name Variance":
    data = data.sort(function(a, b) {
      return getNameVariance(a) - getNameVariance(b);
    });
    break;
  default:
    break;
}
}

function getText(property, a){
  switch(property) {
  case "L Length":
    return getLLength(a);
    break;
  case "L Variance":
    return getLVariance(a);
    break;
  case "C Length":
    return getCLength(a);
    break;
  case "C Variance":
    return getCVariance(a);
    break;
  case "H Length":
    return getHLength(a);
    break;
  case "H Variance":
    return getHVariance(a);
    break;
  case "LAB Length":
    return getLABLength(a);
    break;
  case "LAB Variance":
    return getLABVariance(a);
    break;
  case "Name Length":
    return getNameLength(a);
    break;
  case "Name Variance":
    return getNameVariance(a);
    break;
  default:
    break;
}
}

function displayRamp(prop, ramps, order) {
  var rampWidth = dashboardWidth;
  var boxWidth = 20;
  var rampX = d3.scaleLinear()
    .domain([0,9])
    .range([0, 300]);
  var ramp = ramps[order];

  var rampY = d3.scaleLinear()
      .domain([0,ramps.length])
      .range([0, dashboardHeight]);

  svg.selectAll(".swatch").remove();

  svg.selectAll(".swatch")
      .data(ramp.colors)
      .enter()
      .append("rect")
      .attr("x", function(d, i) {
        return rampX(i);
      })
      .attr("y", rampY(order -1))
      .attr("height", 20)
      .attr("width", 20)
      .attr("fill", function(d) {
        return d;
      })
    svg.append("text")
      .attr("x", 300)
      .attr("y", rampY(order)-12)
      .text(getText(prop, ramp).toFixed(2));


      //svg.append("text")
        //.attr("x", 0)
        //.attr("y", dashboardHeight+10)
        //.text("LAB Length: " + getLABLength(ramp).toFixed(2) + " Name Length: " + getNameLength(ramp).toFixed(2) + " LAB Variance: " + getLABVariance(ramp).toFixed(2) + " Name Variance: " + getNameVariance(ramp).toFixed(2))

  //renderLabDistance(ramp);
  //renderNameDistance(ramp);

}

// Compute the LAB distance--MOVED TO UTILS
/*
function computeLabDistances(ramp) {
  var distances = [0];
  for (var i = 0; i < ramp.colors.length - 1; i++) {
    var c1 = d3.lab(ramp.colors[i]);
    var c2 = d3.lab(ramp.colors[i+1]);
    distances.push(Math.sqrt((c1.l - c2.l)*(c1.l - c2.l) + (c1.a - c2.a)*(c1.a - c2.a) + (c1.b - c2.b)*(c1.b - c2.b)));
  }

  return distances;
}

function computeLDistances(ramp) {
  var distances = [0];
  for (var i = 0; i < ramp.colors.length - 1; i++) {
    var c1 = d3.lab(ramp.colors[i]);
    var c2 = d3.lab(ramp.colors[i+1]);
    distances.push(Math.sqrt((c1.l - c2.l)*(c1.l - c2.l)));
  }

  return distances;
}

function computeCDistances(ramp) {
  var distances = [0];
  for (var i = 0; i < ramp.colors.length - 1; i++) {
    var c1 = d3.hcl(ramp.colors[i]);
    var c2 = d3.hcl(ramp.colors[i+1]);
    distances.push(Math.sqrt((c1.c - c2.c)*(c1.c - c2.c)));
  }

  return distances;
}

function computeHDistances(ramp) {
  var distances = [0];
  for (var i = 0; i < ramp.colors.length - 1; i++) {
    var c1 = d3.hcl(ramp.colors[i]);
    var c2 = d3.hcl(ramp.colors[i+1]);
    distances.push(Math.sqrt((c1.h - c2.h)*(c1.h - c2.h)));
  }

  return distances;
}*/

function renderLabDistance(ramp) {
  // set the dimensions and margins of the graph
  var margin = {top: 60, right: 20, bottom: 50, left: 50},
      width = dashboardWidth/2.0 - margin.left - margin.right,
      height = dashboardHeight - margin.top - margin.bottom;

  // set the ranges
  var x = d3.scaleLinear().range([0, width]);
  var y = d3.scaleLinear().range([height, 0]);

  // append the svg obgect to the body of the page
  // appends a 'group' element to 'svg'
  // moves the 'group' element to the top left margin
  svg.append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Scale the range of the data
    var data = computeLabDistances(ramp);
    //console.log(data)
    x.domain([0, data.length]);
    y.domain([0, Math.max.apply(null, data)]);


    // define the line
    var valueline = d3.line()
        .x(function(d, i) { return x(i) + margin.left; })
        .y(function(d) { return y(d) + margin.top; });

    d3.selectAll("path").remove();
    d3.selectAll("g").remove();
    svg.selectAll("circle").remove();

    // Add the valueline path.
    svg.append("path")
        .data([data])
        .attr("class", "line")
        .attr("d", valueline);

    svg.selectAll(".labPoint")
        .data(data)
        .enter()
        .append("circle")
        .attr("stroke-width", 1)
        .attr("stroke", "steelblue")
        .attr("fill", function(d, i) {
          return ramp.colors[i];
        })
        .attr("r", 10)
        .attr("cx", function(d, i) {
          return x(i) + margin.left;
        })
        .attr("cy", function(d) {
          return y(d) + margin.top;
        });

    // Add the X Axis
    svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
        .call(d3.axisBottom(x));

    svg.append("text")
      .attr("transform",
            "translate(" + (width/2 + margin.left) + " ," +
                           (height + margin.top + 40) + ")")
      .style("text-anchor", "middle")
      .text("CIELAB Distance");



    // Add the Y Axis
    svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(d3.axisLeft(y));
}

// Compute the Name distance
function computeNameDistances(ramp) {
  var distances = [0];
  var colorSet = ramp.colors.map(color);
  for (var i = 0; i < colorSet.length - 1; i++) {
    var c1 = colorSet[i];
    var c2 = colorSet[i+1];
    distances.push(1 - c3.color.cosine(c1.c, c2.c));
  }

  return distances;
}

function renderNameDistance(ramp) {
  // set the dimensions and margins of the graph
  var margin = {top: 60, right: 20, bottom: 50, left: dashboardWidth/2.0+50},
      width = dashboardWidth/2.0 - margin.right,
      height = dashboardHeight - margin.top - margin.bottom;

  // set the ranges
  var x = d3.scaleLinear().range([0, width]);
  var y = d3.scaleLinear().range([height, 0]);

  // append the svg obgect to the body of the page
  // appends a 'group' element to 'svg'
  // moves the 'group' element to the top left margin
  svg.append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Scale the range of the data
    var data = computeNameDistances(ramp);
    //console.log(data)
    x.domain([0, data.length]);
    y.domain([0, 1.0]);


    // define the line
    var valueline = d3.line()
        .x(function(d, i) { return x(i) + margin.left; })
        .y(function(d) { return y(d) + margin.top; });

    // Add the valueline path.
    svg.append("path")
        .data([data])
        .attr("class", "line")
        .attr("d", valueline);

    svg.selectAll(".namePoint")
        .data(data)
        .enter()
        .append("circle")
        .attr("stroke-width", 1)
        .attr("stroke", "steelblue")
        .attr("fill", function(d, i) {
          return ramp.colors[i];
        })
        .attr("r", 10)
        .attr("cx", function(d, i) {
          return x(i) + margin.left;
        })
        .attr("cy", function(d) {
          return y(d) + margin.top;
        });

    // Add the X Axis
    svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
        .call(d3.axisBottom(x));

        svg.append("text")
          .attr("transform",
                "translate(" + (width/2 + margin.left) + " ," +
                               (height + margin.top + 40) + ")")
          .style("text-anchor", "middle")
          .text("Color Name Distance");

    // Add the Y Axis
    svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(d3.axisLeft(y));
}

/*
function getLABLength(ramp) {
  var dists = computeLabDistances(ramp);
  return dists.slice(1, dists.length).reduce(function(a, b){
        return a + b;
    }, 0);
}

function getLLength(ramp) {
  var dists = computeLDistances(ramp);
  return dists.slice(1, dists.length).reduce(function(a, b){
        return a + b;
    }, 0);
}

function getCLength(ramp) {
  var dists = computeCDistances(ramp);
  return dists.slice(1, dists.length).reduce(function(a, b){
        return a + b;
    }, 0);
}

function getHLength(ramp) {
  var dists = computeHDistances(ramp);
  return dists.slice(1, dists.length).reduce(function(a, b){
        return a + b;
    }, 0);
}

function getNameLength(ramp) {
  var dists = computeNameDistances(ramp);
  return dists.slice(1, dists.length).reduce(function(a, b){
        return a + b;
    }, 0);
}

function getLABVariance(ramp) {
  var dists = computeLabDistances(ramp);
  return d3.variance(dists.slice(1, dists.length));
}

function getLVariance(ramp) {
  var dists = computeLDistances(ramp);
  return d3.variance(dists.slice(1, dists.length));
}

function getCVariance(ramp) {
  var dists = computeCDistances(ramp);
  return d3.variance(dists.slice(1, dists.length));
}

function getHVariance(ramp) {
  var dists = computeHDistances(ramp);
  return d3.variance(dists.slice(1, dists.length));
}

function getNameVariance(ramp){
  var dists = computeNameDistances(ramp);
  return d3.variance(dists.slice(1, dists.length));
}*/
// Compute the Structural distance

// Visualize the distances
