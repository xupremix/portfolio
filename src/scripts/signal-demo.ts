// signal_image_video demo — multi-object tracking simulation.
//
// Honesty rules (these fixed real bugs — do not regress):
// - The displayed RMSE is COMPUTED every frame from the on-screen gap between
//   truth and prediction (running window). It is never a canned constant.
//   The real KITTI result (81.5% reduction) appears only as labeled static
//   copy in the sidebar.
// - Both predictors are genuine motion models, not hand-tuned drift:
//     Linear KF  = constant-velocity extrapolation (real CV predict step).
//     CTRV-EKF   = constant-turn-rate-and-velocity propagation (real CTRV
//                  predict step). Its small error comes from real model
//                  mismatch with the trajectories — no injected noise.
// - Trajectories are closed periodic curves (no modulo wrap → no teleports).
// - Delta-time animation (never frame-count); one rAF loop; pause-safe.
//
// Colors: track identity uses sapphire/yellow/maroon (CVD-validated trio);
// predictions are the SAME hue dashed (color follows the entity).

import { setupCanvas, motionSafe, themeColor, withAlpha, type SizedCanvas } from './canvas';

const TRACK_TOKENS = ['sapphire', 'yellow', 'maroon'] as const;
const BOX_W = 40;
const BOX_H = 28;
const LOOKBACK_MS = 250; // velocity/turn-rate estimation window
const HORIZON_MS = 500; // how far ahead both models predict
const WINDOW = 120; // RMSE running-window samples (~12 s at 10 Hz)
const SAMPLE_EVERY_MS = 100;

type Mode = 'linear' | 'ctrv';

// ── Ground truth: closed periodic curves (unit-square coords) ──
// Near-constant-turn trajectories, like vehicles cornering — the exact case
// automotive tracking uses CTRV for, and the exact case CV extrapolation fails.
function truePath(id: number, tMs: number): { x: number; y: number } {
  const t = tMs / 1000;
  if (id === 0) {
    return { x: 0.28 + 0.17 * Math.cos(t * 0.9), y: 0.35 + 0.2 * Math.sin(t * 0.9) };
  }
  if (id === 1) {
    // Faster, opposite direction
    return { x: 0.68 + 0.13 * Math.cos(-t * 1.5 + 2), y: 0.4 + 0.15 * Math.sin(-t * 1.5 + 2) };
  }
  // Wide slow sweep along the bottom
  return { x: 0.5 + 0.3 * Math.cos(t * 0.55 + 4), y: 0.75 + 0.13 * Math.sin(t * 0.55 + 4) };
}

// ── Predictors (real motion-model predict steps) ─────────────
// Semantics: the box shown at time t is the prediction that was made at
// (t − HORIZON) *for* time t — so the on-screen gap is genuine model error,
// exactly what the RMSE measures.
function predictFor(id: number, tMs: number, model: Mode) {
  const base = Math.max(tMs - HORIZON_MS, 1);
  const t0 = Math.max(base - LOOKBACK_MS, 1);
  const p1 = truePath(id, base);
  const p0 = truePath(id, t0);
  const dt = Math.max(base - t0, 1);

  if (model === 'linear') {
    // Constant-velocity extrapolation
    return {
      x: p1.x + ((p1.x - p0.x) / dt) * HORIZON_MS,
      y: p1.y + ((p1.y - p0.y) / dt) * HORIZON_MS,
    };
  }

  // CTRV: estimate heading + turn rate from finite differences, then use the
  // closed-form constant-turn-rate-and-velocity propagation.
  const pPrev = truePath(id, Math.max(base - 50, 0));
  const pPrev0 = truePath(id, Math.max(t0 - 50, 0));
  const dts = dt / 1000;
  const k = HORIZON_MS / 1000;
  const psi1 = Math.atan2(p1.y - pPrev.y, p1.x - pPrev.x);
  const psi0 = Math.atan2(p0.y - pPrev0.y, p0.x - pPrev0.x);
  let dpsi = psi1 - psi0;
  while (dpsi > Math.PI) dpsi -= 2 * Math.PI;
  while (dpsi < -Math.PI) dpsi += 2 * Math.PI;
  const omega = dpsi / dts;
  const v = Math.hypot(p1.x - p0.x, p1.y - p0.y) / dts;

  if (Math.abs(omega) < 1e-4) {
    return { x: p1.x + v * Math.cos(psi1) * k, y: p1.y + v * Math.sin(psi1) * k };
  }
  return {
    x: p1.x + (v / omega) * (Math.sin(psi1 + omega * k) - Math.sin(psi1)),
    y: p1.y + (v / omega) * (-Math.cos(psi1 + omega * k) + Math.cos(psi1)),
  };
}

// ── State ────────────────────────────────────────────────────
let scene: SizedCanvas | null = null;
let spark: SizedCanvas | null = null;
let mode: Mode = 'linear';
let running = false;
let animId = 0;
let lastTs = 0;
let simMs = 0;
let sinceSample = 0;

// Running squared-error windows + RMSE history for the sparkline, per mode.
const sqErr: Record<Mode, number[]> = { linear: [], ctrv: [] };
const history: Record<Mode, number[]> = { linear: [], ctrv: [] };

const el = (id: string) => document.getElementById(id)!;

function rmseOf(m: Mode): number | null {
  const w = sqErr[m];
  if (w.length < 5) return null;
  return Math.sqrt(w.reduce((a, b) => a + b, 0) / w.length);
}

/** Squared prediction error (in px at current canvas size) for one mode, all tracks. */
function sampleError(m: Mode, w: number, h: number) {
  let sum = 0;
  for (let id = 0; id < 3; id++) {
    const a = truePath(id, simMs);
    const p = predictFor(id, simMs, m);
    const dx = (a.x - p.x) * w;
    const dy = (a.y - p.y) * h;
    sum += dx * dx + dy * dy;
  }
  const win = sqErr[m];
  win.push(sum / 3);
  if (win.length > WINDOW) win.shift();
}

// ── Scene drawing ────────────────────────────────────────────
function drawScene() {
  if (!scene) return;
  const { ctx } = scene;
  const { w, h } = scene.size();

  ctx.fillStyle = themeColor('base');
  ctx.fillRect(0, 0, w, h);

  // Recessive grid (token-based so both design modes render correctly)
  ctx.strokeStyle = withAlpha(themeColor('border'), 0.4);
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  for (let id = 0; id < 3; id++) {
    const col = themeColor(TRACK_TOKENS[id]);
    const a = truePath(id, simMs);
    const p = predictFor(id, simMs, mode);
    const ax = a.x * w;
    const ay = a.y * h;
    const px = p.x * w;
    const py = p.y * h;

    // Trail: last 3.5 s of truth, fading tail
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    const steps = 28;
    for (let i = 0; i < steps; i++) {
      const q0 = truePath(id, Math.max(simMs - ((i + 1) * 3500) / steps, 0));
      const q1 = truePath(id, Math.max(simMs - (i * 3500) / steps, 0));
      ctx.globalAlpha = 0.35 * (1 - i / steps);
      ctx.beginPath();
      ctx.moveTo(q0.x * w, q0.y * h);
      ctx.lineTo(q1.x * w, q1.y * h);
      ctx.stroke();
    }
    ctx.restore();

    // Error line: truth → prediction
    ctx.save();
    ctx.strokeStyle = themeColor('subtext');
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.restore();

    // Truth box (solid, entity hue) + ID label
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.fillStyle = col + '22';
    ctx.fillRect(ax - BOX_W / 2, ay - BOX_H / 2, BOX_W, BOX_H);
    ctx.strokeRect(ax - BOX_W / 2, ay - BOX_H / 2, BOX_W, BOX_H);
    ctx.fillStyle = col;
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`ID${id + 1}`, ax - BOX_W / 2 + 2, ay - BOX_H / 2 - 2);
    ctx.restore();

    // Prediction box (dashed, SAME entity hue)
    ctx.save();
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(px - BOX_W / 2, py - BOX_H / 2, BOX_W, BOX_H);
    ctx.restore();
  }
}

// ── Sidebar: stat tile + delta + sparkline ───────────────────
function updatePanel() {
  const cur = rmseOf(mode);
  const other = rmseOf(mode === 'linear' ? 'ctrv' : 'linear');
  el('signal-rmse').textContent = cur === null ? '—' : cur.toFixed(1);
  el('signal-mode-label').textContent = mode === 'linear' ? 'Linear KF' : 'CTRV-EKF';

  const badge = el('signal-delta');
  if (cur !== null && other !== null && other > 0.001) {
    const pct = Math.round(((cur - other) / other) * 100);
    const better = pct < 0;
    badge.textContent = `${better ? '↓' : '↑'} ${Math.abs(pct)}% vs ${mode === 'linear' ? 'CTRV-EKF' : 'Linear KF'}`;
    badge.className =
      'inline-flex items-center gap-xs rounded-full border px-sm py-xs font-mono text-[11px] font-semibold ' +
      (better ? 'border-green/40 bg-green/10 text-green' : 'border-destructive/40 bg-destructive/10 text-destructive');
  } else {
    badge.textContent = 'measuring…';
    badge.className = 'inline-flex items-center rounded-full border border-border px-sm py-xs font-mono text-[11px] text-subtext';
  }
}

function drawSparkline() {
  if (!spark) return;
  const { ctx } = spark;
  const { w, h } = spark.size();
  ctx.clearRect(0, 0, w, h);
  const data = history[mode];
  if (data.length < 2) return;

  // Shared y-scale across BOTH modes so toggling is comparable.
  const all = [...history.linear, ...history.ctrv];
  const max = Math.max(...all, 1);
  const pad = 3;
  const xs = (i: number) => pad + (i / (Math.max(data.length, 100) - 1)) * (w - pad * 2);
  const ys = (v: number) => h - pad - (v / max) * (h - pad * 2);

  ctx.strokeStyle = themeColor('accent');
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  data.forEach((v, i) => (i === 0 ? ctx.moveTo(xs(i), ys(v)) : ctx.lineTo(xs(i), ys(v))));
  ctx.stroke();

  // Endpoint dot
  const lastX = xs(data.length - 1);
  const lastY = ys(data[data.length - 1]);
  ctx.fillStyle = themeColor('accent');
  ctx.beginPath();
  ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ── Loop ─────────────────────────────────────────────────────
function frame(now: number) {
  if (!running) return;
  const dt = Math.min(now - lastTs, 50);
  lastTs = now;
  simMs += dt;
  sinceSample += dt;

  // Warm-up guard: until the sim is HORIZON+LOOKBACK old, predictFor clamps
  // its base time and both models produce meaningless error — don't sample it.
  if (scene && simMs > HORIZON_MS + LOOKBACK_MS + 150 && sinceSample >= SAMPLE_EVERY_MS) {
    sinceSample = 0;
    const { w, h } = scene.size();
    // Both models sampled every tick so the comparison is always live.
    sampleError('linear', w, h);
    sampleError('ctrv', w, h);
    for (const m of ['linear', 'ctrv'] as Mode[]) {
      const r = rmseOf(m);
      if (r !== null) {
        history[m].push(r);
        if (history[m].length > 100) history[m].shift();
      }
    }
    updatePanel();
    drawSparkline();
  }

  drawScene();
  animId = requestAnimationFrame(frame);
}

function start() {
  cancelAnimationFrame(animId);
  running = true;
  lastTs = performance.now();
  animId = requestAnimationFrame(frame);
  setPlayButton(true);
}

function pause() {
  running = false;
  cancelAnimationFrame(animId);
  setPlayButton(false);
}

function setPlayButton(isRunning: boolean) {
  el('signal-icon-pause').classList.toggle('hidden', !isRunning);
  el('signal-icon-play').classList.toggle('hidden', isRunning);
  el('signal-play-label').textContent = isRunning ? 'Pause' : 'Play';
}

function setMode(next: Mode) {
  mode = next;
  document.querySelectorAll<HTMLButtonElement>('.signal-mode-btn').forEach((btn) => {
    const active = btn.dataset.mode === next;
    btn.classList.toggle('bg-accent/15', active);
    btn.classList.toggle('text-accent', active);
    btn.classList.toggle('text-subtext', !active);
    btn.setAttribute('aria-selected', String(active));
  });
  updatePanel();
  drawSparkline();
  if (!running) drawScene();
}

export function initSignalDemo() {
  const dialog = document.getElementById('signal-demo');
  if (!dialog) return;

  dialog.addEventListener('demo-open', () => {
    if (!scene) {
      scene = setupCanvas(el('signal-canvas') as HTMLCanvasElement, 480 / 340, 540);
      spark = setupCanvas(el('signal-spark') as HTMLCanvasElement, 260 / 44, 260);
    }
    if (motionSafe()) {
      start();
    } else {
      pause();
      drawScene();
    }
  });
  dialog.addEventListener('close', pause);

  el('signal-play-pause').addEventListener('click', () => (running ? pause() : start()));
  document.querySelectorAll<HTMLButtonElement>('.signal-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode as Mode));
  });
}
