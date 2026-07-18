// ASA Autobots demo — animated walkthrough of the real system's pipeline.
//
// Honesty notes (keep true if you edit):
// - This is an ILLUSTRATIVE animation, labeled as such in the dialog. It does
//   not run the real agents (they need the Deliveroo server + an LLM API).
// - The vocabulary is real: "BDI Physical Executor", "LLM Cognitive
//   Coordinator (llama-3.3-70b)", "STRIPS PDDL" and the PDDL action syntax
//   `(move-left ag t_4_4 t_3_4)` come from the actual asa-autobots repo
//   (domain `deliveroo-crates`, tiles named t_<col>_<row>).
//
// Animation correctness rules (these fixed real bugs — do not regress):
// - Time-based: phase progress advances by rAF delta-time (ms), never by
//   frame count, so speed is identical at 60 Hz and 144 Hz.
// - One rAF loop. Pause cancels it; resume restarts it. The inter-phase hold
//   is part of the phase timeline (holdMs), never a setTimeout.
// - During the PLAN phase the agent does NOT move: previewPath only draws the
//   dashed route. Movement paths are Manhattan (grid legs), not diagonals.

import { setupCanvas, motionSafe, themeColor, type SizedCanvas } from './canvas';

const COLS = 8;
const ROWS = 7;

interface Cell {
  c: number;
  r: number;
}

// Fixed scene: agent home, parcels (spawn tiles), delivery zones.
const HOME: Cell = { c: 4, r: 4 };
const PARCEL: Cell = { c: 1, r: 1 };
const PARCEL_2: Cell = { c: 5, r: 1 };
const DELIVERY: Cell = { c: 6, r: 4 };
const DELIVERY_2: Cell = { c: 1, r: 5 };

/** Manhattan route between two cells: horizontal leg, then vertical leg. */
function manhattanPath(from: Cell, to: Cell): Cell[] {
  const cells: Cell[] = [{ ...from }];
  const stepC = Math.sign(to.c - from.c);
  for (let c = from.c + stepC; stepC !== 0 && c !== to.c + stepC; c += stepC) {
    cells.push({ c, r: from.r });
  }
  const stepR = Math.sign(to.r - from.r);
  for (let r = from.r + stepR; stepR !== 0 && r !== to.r + stepR; r += stepR) {
    cells.push({ c: to.c, r });
  }
  return cells;
}

/** Real PDDL action lines for a Manhattan route (matches domain_debug.pddl). */
function pddlActions(path: Cell[]): string[] {
  const out: string[] = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const dir = b.c > a.c ? 'move-right' : b.c < a.c ? 'move-left' : b.r > a.r ? 'move-down' : 'move-up';
    out.push(`(${dir} ag t_${a.c}_${a.r} t_${b.c}_${b.r})`);
  }
  return out;
}

const TO_PARCEL = manhattanPath(HOME, PARCEL);
const TO_DELIVERY = manhattanPath(PARCEL, DELIVERY);
const TO_HOME = manhattanPath(DELIVERY, HOME);
const PLAN_LINES = pddlActions(TO_PARCEL);

interface Phase {
  step: number; // index into the sidebar stepper
  log: string;
  bubble: string[];
  durationMs: number;
  holdMs: number;
  previewPath?: Cell[]; // dashed route, drawn in — agent stays put
  agentPath?: Cell[]; // agent walks this route
  carrying?: boolean;
}

const PHASES: Phase[] = [
  {
    step: 0,
    log: 'PddlServiceBridge: solving STRIPS problem…',
    bubble: ['STRIPS plan:', ...PLAN_LINES.slice(0, 3), `… ${PLAN_LINES.length} actions total`],
    durationMs: 2600,
    holdMs: 700,
    previewPath: TO_PARCEL,
  },
  {
    step: 1,
    log: 'LLM Cognitive Coordinator: task assignment',
    bubble: ['llama-3.3-70b:', 'assign parcel t_1_1 → ag', 'contract accepted'],
    durationMs: 2000,
    holdMs: 700,
  },
  {
    step: 2,
    log: 'BDI Physical Executor: intention GO_PICKUP',
    bubble: ['beliefs:', 'carrying = false', 'target = t_1_1', 'intention = GO_PICKUP'],
    durationMs: 3200,
    holdMs: 500,
    agentPath: TO_PARCEL,
  },
  {
    step: 3,
    log: 'BDI Physical Executor: intention GO_DELIVER',
    bubble: ['beliefs:', 'carrying = true', 'target = t_6_4', 'intention = GO_DELIVER'],
    durationMs: 3600,
    holdMs: 500,
    agentPath: TO_DELIVERY,
    carrying: true,
  },
  {
    step: 4,
    log: 'parcel delivered — returning to idle',
    bubble: ['event: delivered ✓', 'intention = IDLE'],
    durationMs: 2600,
    holdMs: 1100,
    agentPath: TO_HOME,
  },
];

// ── State ────────────────────────────────────────────────────
let sized: SizedCanvas | null = null;
let phaseIdx = 0;
let elapsed = 0; // ms into current phase (including hold)
let lastTs = 0;
let animId = 0;
let running = false;

const el = (id: string) => document.getElementById(id)!;

// ── Drawing ──────────────────────────────────────────────────
function cellGeom(w: number, h: number) {
  const cell = Math.min(Math.floor(w / COLS), Math.floor(h / ROWS));
  return { cell, ox: Math.floor((w - COLS * cell) / 2), oy: Math.floor((h - ROWS * cell) / 2) };
}

function draw() {
  if (!sized) return;
  const { ctx } = sized;
  const { w, h } = sized.size();
  const { cell, ox, oy } = cellGeom(w, h);
  const center = (p: Cell) => ({ x: ox + p.c * cell + cell / 2, y: oy + p.r * cell + cell / 2 });

  const phase = PHASES[phaseIdx];
  const t = Math.min(elapsed / phase.durationMs, 1);

  // Board
  ctx.fillStyle = themeColor('mantle');
  ctx.fillRect(0, 0, w, h);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (c + r) % 2 === 0 ? 'rgb(30 30 46 / 0.6)' : 'rgb(24 24 37 / 0.8)';
      ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
      ctx.strokeStyle = themeColor('border');
      ctx.lineWidth = 0.5;
      ctx.strokeRect(ox + c * cell, oy + r * cell, cell, cell);
    }
  }

  // Dashed route: preview (drawing in) or active leg (static)
  const route = phase.previewPath ?? phase.agentPath;
  if (route) {
    const reveal = phase.previewPath ? t : 1;
    ctx.save();
    ctx.strokeStyle = themeColor('accent');
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const upto = Math.max(1, Math.floor(reveal * (route.length - 1)));
    route.slice(0, upto + 1).forEach((p, i) => {
      const { x, y } = center(p);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // Parcels and delivery zones
  const emoji = (glyph: string, p: Cell, size: number) => {
    const { x, y } = center(p);
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, x, y);
  };
  // The tracked parcel disappears from its tile once picked up.
  if (phaseIdx < 3) emoji('📦', PARCEL, cell * 0.42);
  emoji('📦', PARCEL_2, cell * 0.42);
  emoji('🎯', DELIVERY, cell * 0.42);
  emoji('🎯', DELIVERY_2, cell * 0.42);

  // Delivery celebration ring (end of the deliver phase / start of return)
  if (phaseIdx === 4) {
    const ring = Math.min(elapsed / 900, 1);
    const { x, y } = center(DELIVERY);
    ctx.save();
    ctx.globalAlpha = (1 - ring) * 0.8;
    ctx.strokeStyle = themeColor('green');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, cell * (0.3 + ring * 0.55), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = themeColor('green');
    ctx.font = `bold ${Math.round(cell * 0.3)}px "JetBrains Mono", monospace`;
    ctx.fillText('+1', x + cell * 0.7, y - cell * (0.3 + ring * 0.6));
    ctx.restore();
  }

  // Agent position along its route (or parked)
  let agent = { ...HOME };
  if (phase.agentPath) {
    const path = phase.agentPath;
    const dist = t * (path.length - 1);
    const i = Math.min(Math.floor(dist), path.length - 2);
    const f = dist - i;
    agent = {
      c: path[i].c + (path[i + 1].c - path[i].c) * f,
      r: path[i].r + (path[i + 1].r - path[i].r) * f,
    };
  }
  // Phases without a path (plan, assign) keep the agent parked at HOME.
  const ap = { x: ox + agent.c * cell + cell / 2, y: oy + agent.r * cell + cell / 2 };

  // Glow + vector robot (rounded square with eyes)
  const grad = ctx.createRadialGradient(ap.x, ap.y, 2, ap.x, ap.y, cell * 0.7);
  grad.addColorStop(0, 'rgb(203 166 247 / 0.28)');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ap.x, ap.y, cell * 0.7, 0, Math.PI * 2);
  ctx.fill();

  const s = cell * 0.52;
  ctx.fillStyle = themeColor('accent');
  ctx.beginPath();
  ctx.roundRect(ap.x - s / 2, ap.y - s / 2, s, s, s * 0.22);
  ctx.fill();
  ctx.fillStyle = themeColor('base');
  const eye = s * 0.13;
  ctx.beginPath();
  ctx.arc(ap.x - s * 0.18, ap.y - s * 0.08, eye, 0, Math.PI * 2);
  ctx.arc(ap.x + s * 0.18, ap.y - s * 0.08, eye, 0, Math.PI * 2);
  ctx.fill();

  if (phase.carrying) {
    ctx.font = `${Math.round(cell * 0.3)}px sans-serif`;
    ctx.fillText('📦', ap.x + s * 0.55, ap.y - s * 0.55);
  }

  // Speech bubble, sized to its text (fades in, persists through the hold)
  const fadeIn = Math.min(elapsed / 250, 1);
  drawBubble(ctx, w, phase.bubble, ap.x, ap.y - s, fadeIn);
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  lines: string[],
  x: number,
  y: number,
  alpha: number,
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.font = '11px "JetBrains Mono", monospace';
  const pad = 10;
  const lh = 15;
  const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  const bh = lines.length * lh + pad * 2;
  let bx = x + 16;
  let by = y - bh - 6;
  if (bx + bw > canvasW - 4) bx = x - bw - 16;
  if (bx < 4) bx = 4;
  if (by < 4) by = y + 24;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = themeColor('border');
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 6);
  ctx.fill();
  ctx.strokeStyle = themeColor('accent');
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = themeColor('text');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => ctx.fillText(line, bx + pad, by + pad + i * lh));
  ctx.restore();
}

// ── Sidebar stepper ──────────────────────────────────────────
function updateStepper() {
  const active = PHASES[phaseIdx].step;
  document.querySelectorAll<HTMLElement>('[data-asa-step]').forEach((row) => {
    const i = Number(row.dataset.asaStep);
    const dot = row.querySelector('span')!;
    row.classList.toggle('text-text', i === active);
    row.classList.toggle('text-subtext', i !== active);
    dot.className =
      'inline-block h-2.5 w-2.5 shrink-0 rounded-full ' +
      (i < active ? 'bg-green' : i === active ? 'bg-accent' : 'border border-border');
  });
  el('asa-action-log').textContent = PHASES[phaseIdx].log;
}

// ── Animation loop ───────────────────────────────────────────
function frame(now: number) {
  if (!running) return;
  const dt = Math.min(now - lastTs, 50); // cap so background tabs don't jump
  lastTs = now;
  elapsed += dt;

  const phase = PHASES[phaseIdx];
  if (elapsed >= phase.durationMs + phase.holdMs) {
    phaseIdx = (phaseIdx + 1) % PHASES.length;
    elapsed = 0;
    updateStepper();
  }

  draw();
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

function restart() {
  phaseIdx = 0;
  elapsed = 0;
  updateStepper();
  start();
}

function setPlayButton(isRunning: boolean) {
  el('asa-icon-pause').classList.toggle('hidden', !isRunning);
  el('asa-icon-play').classList.toggle('hidden', isRunning);
  el('asa-play-label').textContent = isRunning ? 'Pause' : 'Play';
}

export function initAsaDemo() {
  const dialog = document.getElementById('asa-demo');
  if (!dialog) return;

  dialog.addEventListener('demo-open', () => {
    if (!sized) sized = setupCanvas(el('asa-canvas') as HTMLCanvasElement, 460 / 380, 520);
    phaseIdx = 0;
    elapsed = 0;
    updateStepper();
    if (motionSafe()) {
      start();
    } else {
      // Reduced motion: open paused on the first frame; Play is opt-in.
      pause();
      draw();
    }
  });
  dialog.addEventListener('close', pause);

  el('asa-play-pause').addEventListener('click', () => (running ? pause() : start()));
  el('asa-restart').addEventListener('click', restart);
}
