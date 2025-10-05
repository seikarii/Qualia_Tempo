#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D inputTexture;
uniform vec2 texelSize;

// 13-tap box filter for efficient downsampling
void main() {
  vec3 a = texture(inputTexture, vUv + texelSize * vec2(-2, -2)).rgb;
  vec3 b = texture(inputTexture, vUv + texelSize * vec2( 0, -2)).rgb;
  vec3 c = texture(inputTexture, vUv + texelSize * vec2( 2, -2)).rgb;
  vec3 d = texture(inputTexture, vUv + texelSize * vec2(-2,  0)).rgb;
  vec3 e = texture(inputTexture, vUv + texelSize * vec2( 0,  0)).rgb;
  vec3 f = texture(inputTexture, vUv + texelSize * vec2( 2,  0)).rgb;
  vec3 g = texture(inputTexture, vUv + texelSize * vec2(-2,  2)).rgb;
  vec3 h = texture(inputTexture, vUv + texelSize * vec2( 0,  2)).rgb;
  vec3 i = texture(inputTexture, vUv + texelSize * vec2( 2,  2)).rgb;
  vec3 j = texture(inputTexture, vUv + texelSize * vec2(-1, -1)).rgb;
  vec3 k = texture(inputTexture, vUv + texelSize * vec2( 1, -1)).rgb;
  vec3 l = texture(inputTexture, vUv + texelSize * vec2(-1,  1)).rgb;
  vec3 m = texture(inputTexture, vUv + texelSize * vec2( 1,  1)).rgb;
  
  vec3 result = e * 0.125;
  result += (a + c + g + i) * 0.03125;
  result += (b + d + f + h) * 0.0625;
  result += (j + k + l + m) * 0.125;
  
  fragColor = vec4(result, 1.0);
}
