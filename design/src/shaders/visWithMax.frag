varying vec2 oTexCoord;
uniform sampler2D scalarField;
uniform sampler2D colormap;
uniform float minValue;
uniform float normTerm;

void main()
{
	float data = (texture2D(scalarField, oTexCoord).x - minValue) * normTerm;

	vec2 colormapCoord = vec2(data, 0.5);
	gl_FragColor = texture2D(colormap, colormapCoord);
}
