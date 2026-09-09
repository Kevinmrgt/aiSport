import { HALO_FRAGMENT_SHADER, HALO_VERTEX_SHADER } from './halo-shader';

export interface HaloBackground {
  setPaused: (paused: boolean) => void;
  destroy: () => void;
}

/** Halo uses two small feedback textures, without a scene engine or external requests. */
export function createHaloBackground(canvas: HTMLCanvasElement): HaloBackground | null {
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
  const framebuffer = context.createFramebuffer();
  const textures = [context.createTexture(), context.createTexture()];
  function release() {
    shaders.forEach((shader) => context.deleteShader(shader));
    context.deleteBuffer(buffer);
    context.deleteProgram(program);
    textures.forEach((texture) => context.deleteTexture(texture));
    context.deleteFramebuffer(framebuffer);
  }
  function compile(type: number, source: string) {
    const shader = context.createShader(type);
    if (!shader) return null;
    shaders.push(shader);
    context.shaderSource(shader, source);
    context.compileShader(shader);
    return context.getShaderParameter(shader, context.COMPILE_STATUS) ? shader : null;
  }
  const vertex = compile(context.VERTEX_SHADER, HALO_VERTEX_SHADER);
  const fragment = compile(context.FRAGMENT_SHADER, HALO_FRAGMENT_SHADER);
  if (
    !program ||
    !buffer ||
    !vertex ||
    !fragment ||
    !framebuffer ||
    textures.some((texture) => !texture)
  ) {
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
  const history = context.getUniformLocation(program, 'history');
  const present = context.getUniformLocation(program, 'present');
  let readTexture = 0;
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
    context.activeTexture(context.TEXTURE0);
    context.bindTexture(context.TEXTURE_2D, textures[readTexture]!);
    context.uniform1i(history, 0);
    context.bindFramebuffer(context.FRAMEBUFFER, framebuffer);
    context.framebufferTexture2D(
      context.FRAMEBUFFER,
      context.COLOR_ATTACHMENT0,
      context.TEXTURE_2D,
      textures[1 - readTexture]!,
      0,
    );
    context.uniform1f(present, 0);
    context.drawArrays(context.TRIANGLES, 0, 3);
    context.bindFramebuffer(context.FRAMEBUFFER, null);
    context.uniform1f(present, 1);
    context.drawArrays(context.TRIANGLES, 0, 3);
    readTexture = 1 - readTexture;
  }
  function resize() {
    if (lost || destroyed) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (width === measuredWidth && height === measuredHeight) return;
    measuredWidth = width;
    measuredHeight = height;
    // Cap GPU work, including on high-density phones and 4K monitors.
    const scale = Math.min(1, Math.sqrt(650_000 / Math.max(1, width * height)));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    for (const texture of textures) {
      context.bindTexture(context.TEXTURE_2D, texture);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
      context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.RGBA,
        canvas.width,
        canvas.height,
        0,
        context.RGBA,
        context.UNSIGNED_BYTE,
        null,
      );
    }
    context.viewport(0, 0, canvas.width, canvas.height);
    context.uniform2f(resolution, canvas.width, canvas.height);
    context.uniform2f(viewport, width, height);
    // Seed a complete halo once, including when reduced motion keeps it still.
    for (let warmup = 0; warmup < 8; warmup++) draw();
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
