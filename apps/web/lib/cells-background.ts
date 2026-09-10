import { CELLS_FRAGMENT_SHADER, CELLS_VERTEX_SHADER } from './cells-shader';
import type { HaloBackground } from './halo-background';

/** A single WebGL pass for Vanta Cells; no scene engine or external requests. */
export function createCellsBackground(canvas: HTMLCanvasElement): HaloBackground | null {
  let gl: WebGLRenderingContext | null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
  } catch {
    return null;
  }
  if (!gl) return null;
  const context = gl;
  const shaders: WebGLShader[] = [];
  const program = context.createProgram();
  const buffer = context.createBuffer();
  function release() {
    shaders.forEach((shader) => context.deleteShader(shader));
    context.deleteBuffer(buffer);
    context.deleteProgram(program);
  }
  function compile(type: number, source: string) {
    const shader = context.createShader(type);
    if (!shader) return null;
    shaders.push(shader);
    context.shaderSource(shader, source);
    context.compileShader(shader);
    return context.getShaderParameter(shader, context.COMPILE_STATUS) ? shader : null;
  }
  const vertex = compile(context.VERTEX_SHADER, CELLS_VERTEX_SHADER);
  const fragment = compile(context.FRAGMENT_SHADER, CELLS_FRAGMENT_SHADER);
  if (!program || !buffer || !vertex || !fragment) {
    release();
    return null;
  }
  context.attachShader(program, vertex);
  context.attachShader(program, fragment);
  context.linkProgram(program);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    release();
    return null;
  }
  context.useProgram(program);
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    context.STATIC_DRAW,
  );
  const position = context.getAttribLocation(program, 'position');
  context.enableVertexAttribArray(position);
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
  const resolution = context.getUniformLocation(program, 'resolution');
  const viewport = context.getUniformLocation(program, 'viewport');
  const time = context.getUniformLocation(program, 'time');
  let frame = 0;
  let elapsed = 8;
  let previous = 0;
  let paused = true;
  let lost = false;
  let destroyed = false;
  let measuredWidth = -1;
  let measuredHeight = -1;

  function draw() {
    context.uniform1f(time, elapsed * 0.45);
    context.drawArrays(context.TRIANGLES, 0, 3);
  }
  function resize() {
    if (lost || destroyed) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (width === measuredWidth && height === measuredHeight) return;
    measuredWidth = width;
    measuredHeight = height;
    const scale = Math.min(1, Math.sqrt(650_000 / Math.max(1, width * height)));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.viewport(0, 0, canvas.width, canvas.height);
    context.uniform2f(resolution, canvas.width, canvas.height);
    context.uniform2f(viewport, width, height);
    draw();
  }
  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    if (previous && now - previous < 1000 / 30) return;
    if (previous) elapsed += Math.min(now - previous, 100) / 1000;
    previous = now;
    draw();
  }
  function sync() {
    cancelAnimationFrame(frame);
    previous = 0;
    if (!paused && !document.hidden && !lost && !destroyed) {
      frame = requestAnimationFrame(tick);
    }
  }
  function contextLost() {
    lost = true;
    canvas.dataset['ready'] = 'false';
    sync();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  document.addEventListener('visibilitychange', sync);
  canvas.addEventListener('webglcontextlost', contextLost);
  resize();
  canvas.dataset['ready'] = 'true';
  return {
    setPaused(value) {
      paused = value;
      sync();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.dataset['ready'] = 'false';
      release();
    },
  };
}
