/*
 * Cells shader adapted from Vanta.js, https://github.com/tengbao/vanta
 * Copyright 2020 Teng Bao
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

export const CELLS_VERTEX_SHADER = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

export const CELLS_FRAGMENT_SHADER = `
precision highp float;
uniform vec2 resolution;
uniform vec2 viewport;
uniform float time;

float length2(vec2 p) { return dot(p, p); }
float noise(vec2 p) {
  return fract(sin(fract(sin(p.x) * 43.13311) + p.y) * 31.0011);
}
float worley(vec2 p) {
  float d = 1e30;
  for (int xo = -1; xo <= 1; ++xo) {
    for (int yo = -1; yo <= 1; ++yo) {
      vec2 tp = floor(p) + vec2(xo, yo);
      d = min(d, length2(p - tp - vec2(noise(tp))));
    }
  }
  vec2 uv = gl_FragCoord.xy / resolution;
  float offset = 0.15 * sin(time * 2.0 + 10.0 * (uv.x - uv.y));
  return 3.0 * exp(-4.0 * abs(2.0 * d - 1.0 + offset));
}
float fworley(vec2 p) {
  return sqrt(sqrt(sqrt(1.1 *
    worley(p * 5.0 + 0.3 + time * 0.0525) *
    sqrt(worley(p * 50.0 / 1.5 + 0.3 - time * 0.15)) *
    sqrt(sqrt(worley(p * -10.0 + 9.3))))));
}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  // CSS dimensions keep the cell pattern independent of GPU resolution and DPR.
  float t = fworley(uv * viewport / 1500.0);
  t = max(0.001, t * exp(-length2(abs(0.7 * uv - 1.0))));
  vec3 petrol = vec3(0.0431, 0.1686, 0.1529); // #0B2B27
  vec3 forest = vec3(0.1922, 0.3922, 0.3255); // #316453
  vec3 sage = vec3(0.6275, 0.7686, 0.6667);   // #A0C4AA
  vec3 color = pow(t, 1.0 - t) * (petrol * (1.0 - t) + forest * pow(t, 0.5 - t));
  color = mix(color, sage, smoothstep(0.95, 1.5, t) * 0.18);
  gl_FragColor = vec4(color, 1.0);
}
`;
