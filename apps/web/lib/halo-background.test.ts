import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHaloBackground, type HaloBackground } from './halo-background';

describe('cycle de vie du fond Halo', () => {
  let canvas: HTMLCanvasElement;
  let background: HaloBackground | null;
  let hidden: boolean;
  let resize: () => void;
  let disconnect: ReturnType<typeof vi.fn>;
  let frames: Map<number, FrameRequestCallback>;
  let gl: ReturnType<typeof fakeContext>;
  function fakeContext() {
    return {
      createProgram: vi.fn(() => ({})),
      createBuffer: vi.fn(() => ({})),
      createFramebuffer: vi.fn(() => ({})),
      createTexture: vi.fn(() => ({})),
      deleteFramebuffer: vi.fn(),
      deleteTexture: vi.fn(),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      texParameteri: vi.fn(),
      activeTexture: vi.fn(),
      uniform1i: vi.fn(),
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      useProgram: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      getUniformLocation: vi.fn(() => ({})),
      uniform1f: vi.fn(),
      uniform2f: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
      deleteShader: vi.fn(),
      deleteBuffer: vi.fn(),
      deleteProgram: vi.fn(),
    };
  }
  function nextFrame(now: number) {
    const entry = frames.entries().next().value;
    if (!entry) throw new Error('Aucune animation planifiée');
    frames.delete(entry[0]);
    entry[1](now);
  }
  beforeEach(() => {
    background = null;
    hidden = false;
    frames = new Map();
    let id = 0;
    gl = fakeContext();
    canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(gl as unknown as WebGLRenderingContext);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      width: 1920,
      height: 1080,
    } as DOMRect);
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (frame: number) => frames.delete(frame));
    disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
  });
  afterEach(() => {
    background?.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('limite la résolution GPU tout en conservant les dimensions du motif', () => {
    background = createHaloBackground(canvas);
    expect(canvas.width * canvas.height).toBeLessThan(652_000);
    expect(gl.uniform2f).toHaveBeenLastCalledWith(expect.anything(), 1920, 1080);
    const initialDraws = gl.drawArrays.mock.calls.length;
    expect(initialDraws).toBeGreaterThan(0);
    expect(frames.size).toBe(0);
    resize();
    expect(gl.drawArrays).toHaveBeenCalledTimes(initialDraws);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      width: 320,
      height: 780,
    } as DOMRect);
    resize();
    expect([canvas.width, canvas.height]).toEqual([320, 780]);
    expect(gl.drawArrays.mock.calls.length).toBeGreaterThan(initialDraws);
  });

  it('arrête les calculs en pause, hors de l’onglet et après démontage', () => {
    background = createHaloBackground(canvas);
    const initialDraws = gl.drawArrays.mock.calls.length;
    background!.setPaused(false);
    nextFrame(100);
    nextFrame(110);
    expect(gl.drawArrays).toHaveBeenCalledTimes(initialDraws + 2);
    nextFrame(140);
    expect(gl.drawArrays).toHaveBeenCalledTimes(initialDraws + 4);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(1);
    background!.setPaused(true);
    expect(frames.size).toBe(0);
    background!.setPaused(false);
    background!.destroy();
    background = null;
    expect(frames.size).toBe(0);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
    expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(0);
  });

  it('revient au fond CSS si le contexte graphique est perdu', () => {
    background = createHaloBackground(canvas);
    const initialDraws = gl.drawArrays.mock.calls.length;
    background!.setPaused(false);
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(canvas.dataset['ready']).toBe('false');
    expect(frames.size).toBe(0);
    resize();
    expect(gl.drawArrays).toHaveBeenCalledTimes(initialDraws);
  });

  it.each(['absent', 'interdit', 'compilation', 'liaison', 'allocation', 'feedback'])(
    'ne bloque pas la page lorsque WebGL échoue : %s',
    (failure) => {
      if (failure === 'absent') vi.spyOn(canvas, 'getContext').mockReturnValue(null);
      if (failure === 'interdit')
        vi.spyOn(canvas, 'getContext').mockImplementation(() => {
          throw new Error('WebGL interdit');
        });
      if (failure === 'compilation') gl.getShaderParameter.mockReturnValue(false);
      if (failure === 'liaison') gl.getProgramParameter.mockReturnValue(false);
      if (failure === 'allocation') gl.createShader.mockReturnValue(null as unknown as object);
      if (failure === 'feedback') gl.createTexture.mockReturnValue(null as unknown as object);
      background = createHaloBackground(canvas);
      expect(background).toBeNull();
      expect(frames.size).toBe(0);
      expect(gl.drawArrays).not.toHaveBeenCalled();
    },
  );
});
