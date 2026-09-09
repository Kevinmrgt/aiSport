/*
 * Halo shader adapted from Vanta.js, https://github.com/tengbao/vanta
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

export const HALO_VERTEX_SHADER = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

export const HALO_FRAGMENT_SHADER = `
precision highp float;
uniform vec2 resolution;
uniform vec2 viewport;
uniform float time;
uniform sampler2D history;
uniform float present;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec3 petrol = vec3(0.0431, 0.1686, 0.1529); // #0B2B27, slightly lighter
  vec3 forest = vec3(0.1922, 0.3922, 0.3255); // #316453
  vec3 sage = vec3(0.6275, 0.7686, 0.6667);   // #A0C4AA
  float portrait = 1.0 - smoothstep(0.65, 1.0, viewport.x / viewport.y);
  vec2 center = vec2(0.5, mix(0.53, 0.64, portrait));
  vec2 pixel = (uv - center) * viewport / min(viewport.x, viewport.y);
  float angle = atan(pixel.x, pixel.y);
  float size = mix(2.15, 1.85, portrait);
  float distance = length(pixel) * 8.0 + sin(time) * 0.01;
  float petals = sin(angle * 7.0 + time * 0.5) * sin(time * 1.5) * 0.05 * size;
  float edge = abs((distance + petals) * 0.65 / size);

  // Vanta Halo's feedback drift, constrained to Alcide's green palette.
  vec3 previous = texture2D(history, uv).rgb;
  vec2 drift = uv + vec2(previous.g - 0.2, previous.r - 0.2) * 0.006;
  float spin = mod(time, 6.5) * (0.2 + 0.15 * cos(time * 0.5));
  vec2 expanded = (uv - center) * 0.996 + center;
  vec2 orbit = expanded + vec2(cos(spin), sin(spin)) * 0.001;
  vec3 trail = texture2D(history, drift).rgb * 0.4 + texture2D(history, orbit).rgb * 0.6;
  trail = max(trail - 0.0015, 0.0) * 0.985;

  float highlight = 0.5 + 0.5 * sin(angle * 2.0 - time * 0.65);
  vec3 ringColor = mix(forest, sage, highlight);
  float ring = (1.0 - smoothstep(0.9, 1.0, edge)) * pow(min(edge, 1.0), 20.0);
  vec3 light = clamp(trail + ringColor * ring * 0.22, 0.0, 1.0);
  if (present > 0.5) {
    // Tone-map the accumulated light so a long-running halo cannot wash out text.
    light = light / (0.7 + light) * vec3(0.36, 0.58, 0.45);
    float glow = exp(-3.5 * abs(edge - 0.93)) * 0.06;
    gl_FragColor = vec4(petrol + light + forest * glow, 1.0);
  } else {
    gl_FragColor = vec4(light, 1.0);
  }
}
`;
