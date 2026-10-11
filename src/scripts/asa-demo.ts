// ASA Autobots demo: animated walkthrough of the real system's pipeline.
//
// Honesty notes (keep true if you edit):
// - This is an ILLUSTRATIVE animation, labeled as such in the dialog. It does
//   not run the real agents (they need the Deliveroo server + an LLM API).
// - The vocabulary is real: "BDI Physical Executor", "LLM Cognitive
//   Coordinator (llama-3.3-70b)", "STRIPS PDDL" and the PDDL action syntax
//   `(move-left ag t_4_4 t_3_4)` come from the actual asa-autobots repo
//   (domain `deliveroo-crates`, tiles named t_<col>_<row>).
//
// Animation correctness rules (these fixed real bugs: do not regress):
// - Time-based: phase progress advances by rAF delta-time (ms), never by
//   frame count, so speed is identical at 60 Hz and 144 Hz.
// - One rAF loop. Pause cancels it; resume restarts it. The inter-phase hold
//   is part of the phase timeline (holdMs), never a setTimeout.
// - During the PLAN phase the agent does NOT move: previewPath only draws the
//   dashed route. Movement paths are Manhattan (grid legs), not diagonals.

import { setupCanvas, motionSafe, themeColor, withAlpha, type SizedCanvas } from './canvas';

const COLS = 8;
const ROWS = 7;

interface Cell {
  c: number;
  r: number;
}

// Fixed scene: agent home, parcels (spawn tiles), delivery zones.
// Dynamic scene: agent home, parcels (spawn tiles), delivery zones.
const HOME: Cell = { c: 4, r: 4 };
let parcelCell: Cell = { c: 1, r: 1 };
const PARCEL_2: Cell = { c: 5, r: 1 };
let deliveryCell: Cell = { c: 6, r: 4 };
const DELIVERY_2: Cell = { c: 1, r: 5 };

let hoveredCell: Cell | null = null;
let activeTool: 'parcel' | 'delivery' = 'parcel';

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

interface Phase {
  step: number; // index into the sidebar stepper
  log: string;
  bubble: string[];
  durationMs: number;
  holdMs: number;
  previewPath?: Cell[]; // dashed route, drawn in: agent stays put
  agentPath?: Cell[]; // agent walks this route
  carrying?: boolean;
}

const PHASES: Phase[] = [
  {
    step: 0,
    log: 'PddlServiceBridge: solving STRIPS problem…',
    bubble: ['STRIPS plan:'],
    durationMs: 2600,
    holdMs: 700,
  },
  {
    step: 1,
    log: 'LLM Cognitive Coordinator: task assignment',
    bubble: ['llama-3.3-70b:'],
    durationMs: 2000,
    holdMs: 700,
  },
  {
    step: 2,
    log: 'BDI Physical Executor: intention GO_PICKUP',
    bubble: ['beliefs:'],
    durationMs: 3200,
    holdMs: 500,
  },
  {
    step: 3,
    log: 'BDI Physical Executor: intention GO_DELIVER',
    bubble: ['beliefs:'],
    durationMs: 3600,
    holdMs: 500,
    carrying: true,
  },
  {
    step: 4,
    log: 'parcel delivered: returning to idle',
    bubble: ['event: delivered ✓', 'intention = IDLE'],
    durationMs: 2600,
    holdMs: 1100,
  },
];

function rebuildPlan() {
  const toParcel = manhattanPath(HOME, parcelCell);
  const toDelivery = manhattanPath(parcelCell, deliveryCell);
  const toHome = manhattanPath(deliveryCell, HOME);
  const planLines = pddlActions(toParcel);
  const deliveryPlanLines = pddlActions(toDelivery);

  PHASES[0].previewPath = toParcel;
  PHASES[0].bubble = ['STRIPS plan:', ...planLines.slice(0, 3), `… ${planLines.length} actions total`];
  PHASES[0].durationMs = Math.max(1800, toParcel.length * 300);

  PHASES[1].bubble = ['llama-3.3-70b:', `assign parcel t_${parcelCell.c}_${parcelCell.r} → ag`, 'contract accepted'];

  PHASES[2].bubble = ['beliefs:', 'carrying = false', `target = t_${parcelCell.c}_${parcelCell.r}`, 'intention = GO_PICKUP'];
  PHASES[2].agentPath = toParcel;
  PHASES[2].durationMs = Math.max(2000, toParcel.length * 400);

  PHASES[3].bubble = ['beliefs:', 'carrying = true', `target = t_${deliveryCell.c}_${deliveryCell.r}`, 'intention = GO_DELIVER'];
  PHASES[3].agentPath = toDelivery;
  PHASES[3].durationMs = Math.max(2000, toDelivery.length * 400);

  PHASES[4].agentPath = toHome;
  PHASES[4].durationMs = Math.max(1800, toHome.length * 300);

  const planList = document.getElementById('asa-pddl-plan-list');
  if (planList) {
    const allActions = [
      ...planLines,
      `(pickup ag t_${parcelCell.c}_${parcelCell.r})`,
      ...deliveryPlanLines,
      `(deliver ag t_${deliveryCell.c}_${deliveryCell.r})`
    ];
    planList.innerHTML = allActions
      .map((a, idx) => `<div class="truncate"><span class="text-subtext">${String(idx + 1).padStart(2, '0')}.</span> <span class="text-text">${a}</span></div>`)
      .join('');
  }
}

// Initial plan construction
rebuildPlan();

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
      // Checkerboard from theme tokens so both design modes render correctly
      ctx.fillStyle = (c + r) % 2 === 0 ? withAlpha(themeColor('base'), 0.6) : withAlpha(themeColor('crust'), 0.8);
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

  // Parcels and delivery zones (crisp canvas vector graphics, no emoji fonts)
  const drawItem = (type: 'parcel' | 'delivery', p: Cell, size: number) => {
    const { x, y } = center(p);
    ctx.save();
    if (type === 'parcel') {
      const bSize = size * 0.9;
      ctx.fillStyle = themeColor('peach');
      ctx.strokeStyle = themeColor('text');
      ctx.lineWidth = 1.5;
      ctx.fillRect(x - bSize / 2, y - bSize / 2, bSize, bSize);
      ctx.strokeRect(x - bSize / 2, y - bSize / 2, bSize, bSize);
      ctx.beginPath();
      ctx.moveTo(x - bSize / 2, y);
      ctx.lineTo(x + bSize / 2, y);
      ctx.moveTo(x, y - bSize / 2);
      ctx.lineTo(x, y + bSize / 2);
      ctx.strokeStyle = themeColor('base');
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = themeColor('accent');
      ctx.beginPath();
      ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = themeColor('base');
      ctx.beginPath();
      ctx.arc(x, y, size * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = themeColor('accent');
      ctx.beginPath();
      ctx.arc(x, y, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Hover indicator
  if (hoveredCell) {
    const { cell, ox, oy } = cellGeom(w, h);
    ctx.save();
    ctx.strokeStyle = themeColor('accent');
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + hoveredCell.c * cell, oy + hoveredCell.r * cell, cell, cell);
    ctx.globalAlpha = 0.45;
    drawItem(activeTool === 'parcel' ? 'parcel' : 'delivery', hoveredCell, cell * 0.42);
    ctx.restore();
  }

  // The tracked parcel disappears from its tile once picked up.
  if (phaseIdx < 3) drawItem('parcel', parcelCell, cell * 0.42);
  drawItem('parcel', PARCEL_2, cell * 0.42);
  drawItem('delivery', deliveryCell, cell * 0.42);
  drawItem('delivery', DELIVERY_2, cell * 0.42);

  // Delivery celebration ring (end of the deliver phase / start of return)
  if (phaseIdx === 4) {
    const ring = Math.min(elapsed / 900, 1);
    const { x, y } = center(deliveryCell);
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
  grad.addColorStop(0, withAlpha(themeColor('accent'), 0.28));
  grad.addColorStop(1, withAlpha(themeColor('accent'), 0));
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
    const bSize = cell * 0.26;
    const px = ap.x + s * 0.55;
    const py = ap.y - s * 0.55;
    ctx.save();
    ctx.fillStyle = themeColor('peach');
    ctx.strokeStyle = themeColor('text');
    ctx.lineWidth = 1;
    ctx.fillRect(px - bSize / 2, py - bSize / 2, bSize, bSize);
    ctx.strokeRect(px - bSize / 2, py - bSize / 2, bSize, bSize);
    ctx.restore();
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

  function setTool(tool: 'parcel' | 'delivery') {
    activeTool = tool;
    const isParcel = tool === 'parcel';
    el('asa-tool-parcel')?.classList.toggle('bg-accent/15', isParcel);
    el('asa-tool-parcel')?.classList.toggle('text-accent', isParcel);
    el('asa-tool-parcel')?.classList.toggle('text-subtext', !isParcel);
    el('asa-tool-delivery')?.classList.toggle('bg-accent/15', !isParcel);
    el('asa-tool-delivery')?.classList.toggle('text-accent', !isParcel);
    el('asa-tool-delivery')?.classList.toggle('text-subtext', isParcel);
    if (!running) draw();
  }

  el('asa-tool-parcel')?.addEventListener('click', () => setTool('parcel'));
  el('asa-tool-delivery')?.addEventListener('click', () => setTool('delivery'));

  dialog.addEventListener('demo-open', () => {
    if (!sized) {
      sized = setupCanvas(el('asa-canvas') as HTMLCanvasElement, 460 / 380, 520);

      const canvas = el('asa-canvas') as HTMLCanvasElement;
      canvas.addEventListener('pointermove', (e) => {
        if (!sized) return;
        const rect = canvas.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * sized.size().w;
        const py = ((e.clientY - rect.top) / rect.height) * sized.size().h;
        const { cell, ox, oy } = cellGeom(sized.size().w, sized.size().h);
        const c = Math.floor((px - ox) / cell);
        const r = Math.floor((py - oy) / cell);
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
          hoveredCell = { c, r };
        } else {
          hoveredCell = null;
        }
        if (!running) draw();
      });

      canvas.addEventListener('pointerleave', () => {
        hoveredCell = null;
        if (!running) draw();
      });

      canvas.addEventListener('pointerdown', (e) => {
        if (!sized) return;
        const rect = canvas.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * sized.size().w;
        const py = ((e.clientY - rect.top) / rect.height) * sized.size().h;
        const { cell, ox, oy } = cellGeom(sized.size().w, sized.size().h);
        const c = Math.floor((px - ox) / cell);
        const r = Math.floor((py - oy) / cell);
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
          // Cannot place on HOME agent tile
          if (c === HOME.c && r === HOME.r) return;
          if (activeTool === 'parcel') {
            parcelCell = { c, r };
          } else {
            deliveryCell = { c, r };
          }
          rebuildPlan();
          restart();
        }
      });
    }

    rebuildPlan();
    phaseIdx = 0;
    elapsed = 0;
    updateStepper();
    if (motionSafe()) {
      start();
    } else {
      pause();
      draw();
    }
  });

  dialog.addEventListener('close', pause);

  el('asa-play-pause').addEventListener('click', () => (running ? pause() : start()));
  el('asa-restart').addEventListener('click', restart);
}
