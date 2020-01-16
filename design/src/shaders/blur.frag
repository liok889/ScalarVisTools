varying vec2 oTexCoord;
uniform sampler2D scalarField;
uniform sampler2D colormap;
uniform vec2 pitch;

void main()
{
	vec4 data = texture2D(scalarField, oTexCoord);

	float val=0.0;
	for (int r=-1; r<=1; r++) {
		for (int c=-1; c<=1; c++) {
			val += texture2D(scalarField, oTexCoord + vec2(float(c),float(r)) * pitch).r;
		}
	}
	val /= 3.0*3.0;

	vec2 colormapCoord = vec2(val, 0.5);
	if (val >= 0.0)
	{
		// blur with surround
		gl_FragColor = texture2D(colormap, colormapCoord);
	}
	else
	{
		gl_FragColor = vec4(1.0);
	}
}
