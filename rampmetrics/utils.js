c3.load("c3_data.json");
init();


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
}

// Compute the Name distance

// Compute the LAB distance
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
    var d1 = Math.sqrt((c1.h - c2.h)*(c1.h - c2.h));
    if (d1 > 180) {
      d1 = 360.0 - d1;
    }
    distances.push(d1);
  }

  return distances;
}

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
