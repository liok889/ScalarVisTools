varying vec2 oTexCoord;
uniform sampler2D scalarField;
uniform sampler2D colormap;
uniform float contour;

void main()
{
	vec4 data = texture2D(scalarField, oTexCoord);
	vec2 colormapCoord = vec2(data.x, 0.5);
	if (contour >= 0.0 && abs(data.x-contour) < .0035)
	{
		gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
	}
	else
	{
		if (data.x >= 0.0)
		{
			gl_FragColor = texture2D(colormap, colormapCoord);
		}
		else
		{
			gl_FragColor = vec4(1.0);
			//gl_FragColor = mix(texture2D(colormap, colormapCoord), vec4(1.0), 0.7);
		}
	}
}
