// kindle demo logic.
//
// Four scenario tabs:
//   1–3  REAL kindle API code (src/demo-code/kindle/0*.rs). These cannot build
//        on play.rust-lang.org (kindle links libtorch), so their compiler
//        output is captured on the author's machine by
//        scripts/capture-kindle-outputs.mjs and shown verbatim, labeled with
//        the rustc version. If not captured yet, an explicit notice is shown —
//        never fabricated output.
//   4    Sandbox: self-contained const-generics pattern, editable, compiled
//        LIVE on play.rust-lang.org from the browser (its API allows CORS).
//
// The CodeMirror editor is lazy-loaded on first open (see rust-editor.ts).

import shapeCode from '../demo-code/kindle/01-shape-mismatch.rs?raw';
import dtypeCode from '../demo-code/kindle/02-dtype-mismatch.rs?raw';
import correctCode from '../demo-code/kindle/03-correct.rs?raw';
import sandboxCode from '../demo-code/kindle/04-sandbox.rs?raw';
import captured from '../generated/kindle-outputs.json';
import type { RustEditor } from './rust-editor';

interface Scenario {
  key: string;
  live: boolean; // true → compile on play.rust-lang.org
  ok: boolean; // expected compile result (drives the tab status dot)
  code: string;
  explanation: string;
}

const SCENARIOS: Scenario[] = [
  {
    key: '01-shape-mismatch',
    live: false,
    ok: false,
    code: shapeCode,
    explanation:
      'A Linear<s![784, 256]> layer receives a batch shaped s![2, 512]. Shapes live in the type system (type-level integers via typenum), so rustc rejects the forward call during type checking — the bug is caught at design time, not hours into a training run.',
  },
  {
    key: '02-dtype-mismatch',
    live: false,
    ok: false,
    code: dtypeCode,
    explanation:
      'Both tensors are 2×2, but one is f32 and the other f64. The element type is part of the tensor type too, so mixing dtypes fails to compile. In dynamic frameworks this surfaces as a runtime cast error or silent precision loss.',
  },
  {
    key: '03-correct',
    live: false,
    ok: true,
    code: correctCode,
    explanation:
      'The model is declared as a type — Sequential<Linear<s![784,256]>, …> — and shapes agree end to end, so it compiles and runs on the Candle backend. All the shape bookkeeping is erased at compile time: zero runtime overhead.',
  },
  {
    key: '04-sandbox',
    live: true,
    ok: false,
    code: sandboxCode,
    explanation:
      "kindle isn't on crates.io, so the playground can't build it — this tab is a stand-alone distillation of the same idea using const generics (kindle itself uses typenum type-level integers plus a backend abstraction). Edit freely and compile; this is real rustc on play.rust-lang.org.",
  },
];

const ACTIVE_TAB = ['border-accent', 'bg-accent/15', 'text-accent'];
const IDLE_TAB = ['border-border', 'bg-transparent', 'text-subtext'];

let editor: RustEditor | null = null;
let editorLoading = false;
let current = 0;

const el = (id: string) => document.getElementById(id)!;

function setStatus(msg: string, tone: 'idle' | 'busy' | 'ok' | 'err' = 'idle') {
  const s = el('kindle-status');
  s.textContent = msg;
  s.className =
    'text-[12px] font-mono ' +
    { idle: 'text-subtext', busy: 'text-accent', ok: 'text-green', err: 'text-destructive' }[tone];
}

// Render compiler output with per-line coloring (error/warning/location).
function renderOutput(text: string) {
  const pre = el('kindle-output');
  pre.textContent = '';
  for (const line of text.split('\n')) {
    const span = document.createElement('span');
    span.textContent = line + '\n';
    if (/^error(\[|:| )/.test(line)) span.className = 'text-destructive';
    else if (/^warning/.test(line)) span.className = 'text-yellow';
    else if (/^\s*-->|^\s*= note|^note:/.test(line)) span.className = 'text-subtext';
    else span.className = 'text-text';
    pre.appendChild(span);
  }
}

function renderNotice(text: string) {
  const pre = el('kindle-output');
  pre.textContent = '';
  const span = document.createElement('span');
  span.className = 'text-subtext';
  span.textContent = text;
  pre.appendChild(span);
}

function showCapturedOutput(s: Scenario) {
  const entry = (captured.outputs as Record<string, { success: boolean; output: string } | null>)[s.key];
  if (entry) {
    renderOutput(entry.output);
    setStatus(
      (entry.success ? '✓ compiled + ran · ' : '✗ compile error · ') + (captured.capturedWith ?? 'rustc'),
      entry.success ? 'ok' : 'err',
    );
  } else {
    renderNotice(
      'Compiler output not captured yet for this scenario.\n\n' +
        'Run on a machine with the kindle repo:\n' +
        '  node scripts/capture-kindle-outputs.mjs\n' +
        'then commit src/generated/kindle-outputs.json.',
    );
    setStatus('output pending capture', 'idle');
  }
}

function selectScenario(idx: number) {
  current = idx;
  const s = SCENARIOS[idx];

  document.querySelectorAll<HTMLButtonElement>('.kindle-tab').forEach((btn, i) => {
    const active = i === idx;
    btn.classList.remove(...(active ? IDLE_TAB : ACTIVE_TAB));
    btn.classList.add(...(active ? ACTIVE_TAB : IDLE_TAB));
    btn.setAttribute('aria-selected', String(active));
  });

  editor?.setCode(s.code);
  el('kindle-explanation').textContent = s.explanation;

  // Live tab gets the compile button; captured tabs show stored output.
  const compileBtn = el('kindle-compile-btn');
  compileBtn.classList.toggle('hidden', !s.live);
  compileBtn.classList.toggle('inline-flex', s.live);
  el('kindle-live-hint').classList.toggle('hidden', s.live);
  el('kindle-source-note').textContent = s.live
    ? 'Editable sandbox — compiled live by play.rust-lang.org.'
    : 'Real kindle API. Output captured by running rustc against the actual crate; edit & experiment in the Sandbox tab.';

  if (s.live) {
    renderNotice('Hit "Compile" to run rustc on this code.');
    setStatus('ready', 'idle');
  } else {
    showCapturedOutput(s);
  }
}

async function ensureEditor() {
  if (editor || editorLoading) return;
  editorLoading = true;
  setStatus('loading editor…', 'busy');
  try {
    const { createRustEditor } = await import('./rust-editor');
    editor = createRustEditor(el('kindle-editor'), SCENARIOS[current].code, () => {
      if (SCENARIOS[current].live) compile();
    });
    setStatus('ready', 'idle');
  } catch {
    setStatus('editor failed to load', 'err');
  } finally {
    editorLoading = false;
  }
}

async function compile() {
  const s = SCENARIOS[current];
  if (!s.live) return;
  const code = editor ? editor.getCode() : s.code;
  const btn = el('kindle-compile-btn') as HTMLButtonElement;
  btn.disabled = true;
  btn.classList.add('opacity-60');
  setStatus('compiling on play.rust-lang.org…', 'busy');

  try {
    const res = await fetch('https://play.rust-lang.org/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'stable',
        mode: 'debug',
        edition: '2021',
        crateType: 'bin',
        tests: false,
        backtrace: false,
        code,
      }),
    });
    const data = await res.json();
    if (data.success) {
      renderOutput(data.stdout || '(no output)');
      setStatus('✓ compiled + ran', 'ok');
    } else {
      renderOutput(data.stderr || 'Unknown error');
      setStatus('✗ compile error', 'err');
    }
  } catch {
    if (code === s.code) {
      // Unedited sandbox → we can honestly show the pre-captured rustc result.
      renderOutput(captured.sandboxFallback.output);
      setStatus(`✗ compile error · cached (offline) · ${captured.sandboxFallback.capturedWith}`, 'err');
    } else {
      renderNotice('play.rust-lang.org is unreachable, so edited code cannot be compiled right now. Check your connection and retry.');
      setStatus('network error', 'err');
    }
  } finally {
    btn.disabled = false;
    btn.classList.remove('opacity-60');
  }
}

export function initKindleDemo() {
  const dialog = document.getElementById('kindle-demo');
  if (!dialog) return;

  dialog.addEventListener('demo-open', () => {
    ensureEditor();
  });

  document.querySelectorAll<HTMLButtonElement>('.kindle-tab').forEach((btn, i) => {
    btn.addEventListener('click', () => selectScenario(i));
  });
  el('kindle-compile-btn').addEventListener('click', compile);
  el('kindle-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(el('kindle-output').textContent ?? '').then(() => {
      setStatus('output copied', 'idle');
    });
  });

  selectScenario(0);
}
