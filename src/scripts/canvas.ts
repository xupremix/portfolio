// Shared canvas helpers for the demo dialogs.

export interface SizedCanvas {
  ctx: CanvasRenderingContext2D;
  /** Current CSS-pixel size — read every frame; tracks container resizes. */
  size: () => { w: number; h: number };
}

/**
 * Make a canvas fill its parent up to maxW CSS px at a fixed aspect ratio,
 * backed by a devicePixelRatio-scaled buffer so it stays crisp on hi-dpi.
 */
export function setupCanvas(canvas: HTMLCanvasElement, aspect: number, maxW: number): SizedCanvas {
  const ctx = canvas.getContext('2d')!;
  let cssW = maxW;
  let cssH = Math.round(maxW / aspect);

  const resize = () => {
    const parentW = canvas.parentElement?.clientWidth ?? maxW;
    cssW = Math.max(200, Math.min(maxW, parentW));
    cssH = Math.round(cssW / aspect);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();
  new ResizeObserver(resize).observe(canvas.parentElement ?? canvas);

  return { ctx, size: () => ({ w: cssW, h: cssH }) };
}

export function motionSafe(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Read a `--color-*` design token off the document root. */
export function themeColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
}
