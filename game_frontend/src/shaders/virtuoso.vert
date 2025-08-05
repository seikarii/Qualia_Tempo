// virtuoso.vert
precision mediump float;
attribute vec2 a_position;
uniform mat3 u_projection;
void main() {
    gl_Position = vec4((u_projection * vec3(a_position, 1.0)).xy, 0.0, 1.0);
}
