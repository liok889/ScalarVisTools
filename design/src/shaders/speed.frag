// texture coordinates
varying vec2 oTexCoord;

// uniforms
uniform float hPitch;
uniform float vPitch;
uniform sampler2D colorDiff;
uniform sampler2D colorDiffScale;

void main() 
{
	gl_FragColor = vec4(1.0);
}