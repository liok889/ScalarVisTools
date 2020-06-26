var STEP_START = 0.1/4;
var STEP_SAMPLES = 6;
var STEP_S = 0.1/12;
var STEP = 0.1/1.0;
var STEP_P = 0.1/6;

// function to sample a continuous colormap returning a discrete color sequence
function sampleRamp(colormap, n)
{
	if (!n) n=9;
	var ramp = {
		name: "nothing",
		colors: []
	};

	for (var i=0; i<n; i++)
	{
		var c = colormap.mapValue(i/(n-1));
		ramp.colors.push(c);
	}
	return ramp;
}


function getLocalNameVariation(colormap, n)
{
	var localNVar = 0, samples = 0, localLabDiff = 0;
	for (var k=0, s=STEP_START; k<STEP_SAMPLES; s+= STEP_S, samples++, k++)
	{
		var l = (STEP - STEP_START) * (k/(STEP_SAMPLES-1)) + STEP_START;
		s = l;
		var c0=colormap.mapValue(n);
		var c_1 = colormap.mapValue(n-s);
		var c_2 = colormap.mapValue(n+s);

		// compute local LAB differences
		/*
		var l0 = d3.lab(c0);
		var l1 = d3.lab(c_1);
		var l2 = d3.lab(c_2);

		
		var labDiff = 
			Math.sqrt(Math.pow(l0.b-l1.b, 2) +
			Math.pow(l0.a-l1.a, 2) +
			Math.pow(l0.l-l1.l, 2));

					labDiff += Math.sqrt(Math.pow(l0.b-l2.b, 2) +
		Math.pow(l0.a-l2.a, 2) +
			Math.pow(l0.l-l2.l, 2))
		localLabDiff += labDiff;

		*/

		// compute local name variation
		localNVar = Math.max(localNVar, getNameLength({colors: [c_1, c0, c_2]}));
	}
	return localNVar;
}
