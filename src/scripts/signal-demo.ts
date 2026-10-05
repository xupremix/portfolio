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
let horizonMs = 500; // dynamic horizon ahead
let noiseEnabled = false;
let trackSource: 'preset' | 'interactive' = 'preset';
const WINDOW = 120; // RMSE running-window samples (~12 s at 10 Hz)
const SAMPLE_EVERY_MS = 100;

type Mode = 'linear' | 'ctrv';

// ── Ground truth: closed periodic curves (unit-square coords) ──
function truePath(id: number, tMs: number): { x: number; y: number } {
  const t = tMs / 1000;
  if (id === 0) {
    return { x: 0.28 + 0.17 * Math.cos(t * 0.9), y: 0.35 + 0.2 * Math.sin(t * 0.9) };
  }
  if (id === 1) {
    return { x: 0.68 + 0.13 * Math.cos(-t * 1.5 + 2), y: 0.4 + 0.15 * Math.sin(-t * 1.5 + 2) };
  }
  return { x: 0.5 + 0.3 * Math.cos(t * 0.55 + 4), y: 0.75 + 0.13 * Math.sin(t * 0.55 + 4) };
}

// ── Interactive Steering state ──────────────────────────────
let targetPointer = { x: 0.5, y: 0.5 };
let userVehicle = { x: 0.5, y: 0.5, psi: 0, v: 0.2 };
const userHistory: { t: number; x: number; y: number }[] = [];

function updateUserVehicle(dtSec: number) {
  const dx = targetPointer.x - userVehicle.x;
  const dy = targetPointer.y - userVehicle.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0.03) {
    const targetPsi = Math.atan2(dy, dx);
    let dPsi = targetPsi - userVehicle.psi;
    while (dPsi > Math.PI) dPsi -= 2 * Math.PI;
    while (dPsi < -Math.PI) dPsi += 2 * Math.PI;

    const maxTurnRate = 4.2;
    const omega = Math.max(-maxTurnRate, Math.min(maxTurnRate, dPsi * 4.5));
    userVehicle.psi += omega * dtSec;

    const targetV = Math.min(0.38, Math.max(0.08, dist * 1.3));
    userVehicle.v += (targetV - userVehicle.v) * Math.min(1, dtSec * 3);
  } else {
    userVehicle.v = Math.max(0.05, userVehicle.v * 0.95);
  }

  userVehicle.x += userVehicle.v * Math.cos(userVehicle.psi) * dtSec;
  userVehicle.y += userVehicle.v * Math.sin(userVehicle.psi) * dtSec;
  userVehicle.x = Math.max(0.06, Math.min(0.94, userVehicle.x));
  userVehicle.y = Math.max(0.06, Math.min(0.94, userVehicle.y));

  userHistory.push({ t: simMs, x: userVehicle.x, y: userVehicle.y });
  if (userHistory.length > 250) userHistory.shift();
}

function userPathAt(tMs: number): { x: number; y: number } {
  if (userHistory.length === 0) return { x: userVehicle.x, y: userVehicle.y };
  if (tMs <= userHistory[0].t) return { x: userHistory[0].x, y: userHistory[0].y };
  const last = userHistory[userHistory.length - 1];
  if (tMs >= last.t) return { x: last.x, y: last.y };

  for (let i = userHistory.length - 1; i >= 1; i--) {
    if (userHistory[i].t >= tMs && userHistory[i - 1].t <= tMs) {
      const p0 = userHistory[i - 1];
      const p1 = userHistory[i];
      const dt = p1.t - p0.t;
      const f = dt > 0 ? (tMs - p0.t) / dt : 0;
      return { x: p0.x + (p1.x - p0.x) * f, y: p0.y + (p1.y - p0.y) * f };
    }
  }
  return { x: userVehicle.x, y: userVehicle.y };
}

// ── Predictors (real motion-model predict steps) ─────────────
function predictFor(id: number, tMs: number, model: Mode) {
  const getPath = (t: number) => (trackSource === 'interactive' ? userPathAt(t) : truePath(id, t));
  const base = Math.max(tMs - horizonMs, 1);
  const t0 = Math.max(base - LOOKBACK_MS, 1);
  const p1 = getPath(base);
  const p0 = getPath(t0);
  const dt = Math.max(base - t0, 1);

  if (model === 'linear') {
    return {
      x: p1.x + ((p1.x - p0.x) / dt) * horizonMs,
      y: p1.y + ((p1.y - p0.y) / dt) * horizonMs,
    };
  }

  const pPrev = getPath(Math.max(base - 50, 0));
  const pPrev0 = getPath(Math.max(t0 - 50, 0));
  const dts = dt / 1000;
  const k = horizonMs / 1000;
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

const sqErr: Record<Mode, number[]> = { linear: [], ctrv: [] };
const history: Record<Mode, number[]> = { linear: [], ctrv: [] };

const el = (id: string) => document.getElementById(id)!;

function rmseOf(m: Mode): number | null {
  const w = sqErr[m];
  if (w.length < 5) return null;
  return Math.sqrt(w.reduce((a, b) => a + b, 0) / w.length);
}

function sampleError(m: Mode, w: number, h: number) {
  let sum = 0;
  const count = trackSource === 'interactive' ? 1 : 3;
  for (let id = 0; id < count; id++) {
    const a = trackSource === 'interactive' ? userPathAt(simMs) : truePath(id, simMs);
    const p = predictFor(id, simMs, m);
    const dx = (a.x - p.x) * w;
    const dy = (a.y - p.y) * h;
    sum += dx * dx + dy * dy;
  }
  const win = sqErr[m];
  win.push(sum / count);
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

  if (trackSource === 'interactive') {
    // Draw target pointer cursor
    const tx = targetPointer.x * w;
    const ty = targetPointer.y * h;
    ctx.save();
    ctx.strokeStyle = themeColor('accent');
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(tx, ty, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx - 12, ty);
    ctx.lineTo(tx + 12, ty);
    ctx.moveTo(tx, ty - 12);
    ctx.lineTo(tx, ty + 12);
    ctx.stroke();
    ctx.restore();

    // User vehicle
    const col = themeColor('accent');
    const a = userPathAt(simMs);
    const p = predictFor(0, simMs, mode);
    const ax = a.x * w;
    const ay = a.y * h;
    const px = p.x * w;
    const py = p.y * h;

    // Trail
    if (userHistory.length > 2) {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      for (let i = 1; i < userHistory.length; i++) {
        const q0 = userHistory[i - 1];
        const q1 = userHistory[i];
        ctx.globalAlpha = 0.4 * (i / userHistory.length);
        ctx.beginPath();
        ctx.moveTo(q0.x * w, q0.y * h);
        ctx.lineTo(q1.x * w, q1.y * h);
        ctx.stroke();
      }
      ctx.restore();
    }

    // LiDAR noise scatter
    if (noiseEnabled) {
      ctx.save();
      ctx.fillStyle = themeColor('subtext');
      for (let s = 0; s < 6; s++) {
        const nx = ax + (Math.sin(simMs * 0.02 + s * 1.5) * 8);
        const ny = ay + (Math.cos(simMs * 0.03 + s * 2.1) * 8);
        ctx.beginPath();
        ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Error line
    ctx.save();
    ctx.strokeStyle = themeColor('subtext');
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.restore();

    // Truth box
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.fillStyle = col + '25';
    ctx.fillRect(ax - BOX_W / 2, ay - BOX_H / 2, BOX_W, BOX_H);
    ctx.strokeRect(ax - BOX_W / 2, ay - BOX_H / 2, BOX_W, BOX_H);
    ctx.fillStyle = col;
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('YOU', ax - BOX_W / 2 + 2, ay - BOX_H / 2 - 2);
    ctx.restore();

    // Prediction box
    ctx.save();
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(px - BOX_W / 2, py - BOX_H / 2, BOX_W, BOX_H);
    ctx.restore();
  } else {
    // Preset 3 tracks
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

      // LiDAR noise scatter
      if (noiseEnabled) {
        ctx.save();
        ctx.fillStyle = themeColor('subtext');
        for (let s = 0; s < 5; s++) {
          const nx = ax + Math.sin(simMs * 0.03 + s * 1.8 + id) * 7;
          const ny = ay + Math.cos(simMs * 0.02 + s * 2.3 + id) * 7;
          ctx.beginPath();
          ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

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
}

// ── Sidebar: stat tile + delta + sparkline ───────────────────
function updatePanel() {
  const cur = rmseOf(mode);
  const other = rmseOf(mode === 'linear' ? 'ctrv' : 'linear');
  el('signal-rmse').textContent = cur === null ? '—' : cur.toFixed(1);
  el('signal-mode-label').textContent = `${mode === 'linear' ? 'Linear KF' : 'CTRV-EKF'} · ${horizonMs} ms horizon`;

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

  if (trackSource === 'interactive') {
    updateUserVehicle(dt / 1000);
  }

  if (scene && simMs > horizonMs + LOOKBACK_MS + 150 && sinceSample >= SAMPLE_EVERY_MS) {
    sinceSample = 0;
    const { w, h } = scene.size();
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

function setTrackSource(src: 'preset' | 'interactive') {
  trackSource = src;
  const isPreset = src === 'preset';
  el('signal-source-preset')?.classList.toggle('bg-accent/15', isPreset);
  el('signal-source-preset')?.classList.toggle('text-accent', isPreset);
  el('signal-source-preset')?.classList.toggle('text-subtext', !isPreset);
  el('signal-source-interactive')?.classList.toggle('bg-accent/15', !isPreset);
  el('signal-source-interactive')?.classList.toggle('text-accent', !isPreset);
  el('signal-source-interactive')?.classList.toggle('text-subtext', isPreset);
  el('signal-canvas-hint')?.classList.toggle('hidden', isPreset);
  sqErr.linear = [];
  sqErr.ctrv = [];
  history.linear = [];
  history.ctrv = [];
  if (!running) drawScene();
}

export function initSignalDemo() {
  const dialog = document.getElementById('signal-demo');
  if (!dialog) return;

  dialog.addEventListener('demo-open', () => {
    if (!scene) {
      scene = setupCanvas(el('signal-canvas') as HTMLCanvasElement, 480 / 340, 540);
      spark = setupCanvas(el('signal-spark') as HTMLCanvasElement, 260 / 44, 260);

      const canvas = el('signal-canvas') as HTMLCanvasElement;
      const updatePointer = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0.08, Math.min(0.92, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0.08, Math.min(0.92, (e.clientY - rect.top) / rect.height));
        targetPointer = { x, y };
      };
      canvas.addEventListener('pointermove', updatePointer);
      canvas.addEventListener('pointerdown', (e) => {
        updatePointer(e);
        if (trackSource !== 'interactive') {
          setTrackSource('interactive');
        }
      });
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

  el('signal-source-preset')?.addEventListener('click', () => setTrackSource('preset'));
  el('signal-source-interactive')?.addEventListener('click', () => setTrackSource('interactive'));

  const horizonSlider = document.getElementById('signal-horizon-slider') as HTMLInputElement;
  const horizonVal = document.getElementById('signal-horizon-val');
  horizonSlider?.addEventListener('input', () => {
    horizonMs = Number(horizonSlider.value);
    if (horizonVal) horizonVal.textContent = `${horizonMs} ms`;
    updatePanel();
  });

  const noiseCheckbox = document.getElementById('signal-sensor-noise') as HTMLInputElement;
  noiseCheckbox?.addEventListener('change', () => {
    noiseEnabled = noiseCheckbox.checked;
  });
}
