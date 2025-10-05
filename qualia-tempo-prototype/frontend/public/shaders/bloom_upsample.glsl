#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D inputTexture;
uniform vec2 texelSize;
uniform float filterRadius;

// 9-tap tent filter for smooth upsampling
void main() {
  vec3 a = texture(inputTexture, vUv + texelSize * vec2(-1, -1) * filterRadius).rgb;
  vec3 b = texture(inputTexture, vUv + texelSize * vec2( 0, -1) * filterRadius).rgb;
  vec3 c = texture(inputTexture, vUv + texelSize * vec2( 1, -1) * filterRadius).rgb;
  vec3 d = texture(inputTexture, vUv + texelSize * vec2(-1,  0) * filterRadius).rgb;
  vec3 e = texture(inputTexture, vUv + texelSize * vec2( 0,  0) * filterRadius).rgb;
  vec3 f = texture(inputTexture, vUv + texelSize * vec2( 1,  0) * filterRadius).rgb;
  vec3 g = texture(inputTexture, vUv + texelSize * vec2(-1,  1) * filterRadius).rgb;
  vec3 h = texture(inputTexture, vUv + texelSize * vec2( 0,  1) * filterRadius).rgb;
  vec3 i = texture(inputTexture, vUv + texelSize * vec2( 1,  1) * filterRadius).rgb;
  
  vec3 result = e * 0.25;
  result += (b + d + f + h) * 0.125;
  result += (a + c + g + i) * 0.0625;
  
  fragColor = vec4(result, 1.0);
}
