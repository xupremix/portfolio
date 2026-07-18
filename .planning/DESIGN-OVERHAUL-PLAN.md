# Design Overhaul & Demo Correction — Implementation Plan

**Status:** Plan only — no code changed yet. Written 2026-07-17 against the working tree
(commit `6dd0bde` + uncommitted changes: server output, `src/pages/api/*`, demo edits).

**Scope:** (A) restore the static-first architecture and fix every demo bug found in review,
(B) rebuild the four demos so they are honest, correct, and mobile-usable,
(C) element-by-element visual upgrade of every section, (D) SEO/meta/perf/a11y hardening.

Phases are ordered by dependency. Each task lists exact files, exact changes, and acceptance
criteria. Feed phases into `/gsd-plan-phase` / `/gsd-execute-phase` as phases 04–07, or run
sequentially with `/gsd-quick` per task.

---

## 0. Review findings (what is wrong today)

### 0.1 Architecture — the site is no longer static (CRITICAL)

`astro.config.mjs` was switched to `output: 'server'` with `@astrojs/node` to support
`src/pages/api/{kindle,asa,signal,nlu}.ts`. This violates the project's core constraint
(*"static-first for speed"*) and it buys nothing:

- `api/asa.ts` returns a **hard-coded constant array** (animation phases).
- `api/signal.ts` returns **hard-coded constants** (`rmseLinear: 21.4`, `rmseCtrv: 3.9`).
- `api/nlu.ts` returns a **hard-coded example lookup** after a **fake 800 ms `setTimeout`**
  that simulates "model inference" that never happens.
- `api/kindle.ts` is the only one that does real work — and it must not exist (see 0.2).

All three data routes must become inline client-side constants; the site returns to
`output: 'static'` and deploys as plain files.

### 0.2 `api/kindle.ts` — remote code execution on the host machine (CRITICAL)

The route writes arbitrary POSTed code to a temp Cargo project and runs `cargo check` on
the server. Compilation executes attacker code (`build.rs`, proc-macros), so any visitor
can run arbitrary code on the machine hosting the site. Additional defects:

- Hard-codes `kindle = { path = "/home/xupremix/Projects/kindle" }` — works only on this
  laptop, and the demo snippets never even `use kindle` (they define their own
  `Tensor`/`Linear`), so the dependency is dead weight that drags in `tch-rs`/libtorch.
- `cargo check --offline` fails on any machine without a warmed registry cache.
- The UI header says *"Real Rust compilation via play.rust-lang.org"* while the server
  compiles locally — the claim and the implementation disagree.
- Response JSON sets `stdout` and `stderr` to the same combined string.

**Fix direction:** delete the route; call the Rust Playground **directly from the browser**
(its API is CORS-open — mdBook's editable code blocks use it the same way), with
precomputed outputs as offline fallback. Details in Phase 2, Task 2.2.

### 0.3 AsaDemo — five concrete bugs

1. **Literal `\n` in bubbles.** `api/asa.ts` writes `'PDDL: (move agent r1 c1)\\n…'` in a
   `.ts` string — that is backslash+n *characters*, not a newline. Client `drawBubble`
   splits on `'\n'` (real newline), finds nothing, and renders one long line containing
   visible `\n` text that overflows the 170 px bubble.
2. **Agent moves during the "planning" phase.** Phase 0 ("PDDL Planner computing route")
   has `pathFrom {1,1} → pathTo {6,4}`, and `frame()` moves the agent along *any* phase
   path — so the robot teleports from (4,4) to the restaurant and drives the route while
   the log claims the planner is only *computing* it, then snaps back to (4,4) at phase 2.
3. **Frame-count timing.** `phase.t += 1` per rAF frame → the whole animation runs 2.4×
   faster on a 144 Hz monitor than on 60 Hz. Same bug in SignalDemo (`t += 1`).
4. **Pause/Restart races.** The 800 ms `setTimeout` between phases ignores `running`
   (pausing during the gap un-pauses), and Restart during the gap starts a second rAF
   loop (`animId` only tracks one), doubling animation speed.
5. **Silent death without the API.** If `fetch('/api/asa')` fails, `PHASES` stays empty and
   the dialog opens onto a blank canvas with no message.

Minor: `ax`/`ay` computed and never used; straight-line lerp between cells cuts diagonally
across the grid, which contradicts the grid/PDDL fiction.

### 0.4 SignalDemo — the "live metric" is fake

1. `computeRMSE()` **computes the real prediction error, discards it**, and returns the
   fetched constant (21.4 / 3.9) plus `Math.random()` noise. A fabricated live metric is
   exactly what the project's *content accuracy* constraint forbids.
2. **S-curve teleport.** Track 2's x uses `(t * 0.8) % (W * 0.7)` — on wrap the object
   jumps across the canvas and the trail loop draws a horizontal artifact line through
   the scene.
3. **Negative-time sampling.** `linearPred` reads `truePath(id, t - 18)` — for `t < 18`
   track 2's modulo goes negative and predictions spawn off-canvas at start.
4. `ctrvPred` adds fresh `Math.random()` jitter every frame → the "good" tracker vibrates.
5. Units: RMSE shown in `px` while the headline claim (81.5 %) comes from KITTI in meters —
   needs an explicit "simulation" label to stay honest.
6. Dead code: `isLinear` in the toggle handler. Frame-count timing (see 0.3.3).

### 0.5 NluDemo — fake inference (worst honesty bug)

1. Free-text input + `EXAMPLES.find(...) || EXAMPLES[0]`: typing anything unrecognized —
   e.g. `hello` — returns the *boston→denver* result. The UI then shows **"FLIGHT · 98.5 %
   confidence"** with slot annotations for a sentence the user never typed. A recruiter
   who tries one free-form query immediately sees the demo is fake.
2. The whole `EXAMPLES` array is duplicated verbatim in `NluDemo.astro` **and**
   `api/nlu.ts`; the client copy (`findExample`) is dead code because `classify()` always
   hits the server.
3. Errors surface via `alert()`.
4. `chicago` in "list the airports in chicago" is tagged `airport_name`; in ATIS gold
   annotation that token is a city name (`toloc.city_name` / `city_name`). Fix the label
   or swap the example for a real `airport_name` query ("which airlines serve JFK").
5. The commented-out `execAsync('python3 …/Desktop/NLU/inference.py')` hints at the same
   localhost-only trap as kindle. Delete.

### 0.6 Cross-cutting demo problems

- **Unusable on mobile.** Every dialog is a fixed side-by-side flex row with a fixed
  260–340 px sidebar and fixed-size canvases (460×380, 480×340). Below ~700 px the canvas
  is crushed/clipped. Recruiters open portfolio links on phones.
- **Blurry canvases.** No `devicePixelRatio` scaling — every canvas is blurry on retina.
- **Inline styles everywhere.** All four dialogs hand-roll hex values (`#313244`,
  `#cba6f7`, …) in `style=""` attributes, bypassing the Tailwind theme; header/close/panel
  markup is copy-pasted 4×. Needs a shared `DemoDialog.astro`.
- **CDN dependency.** Monaco (~2 MB) + its CSS load from jsdelivr at runtime; the `<link>`
  also sits in body via the component. Self-host or replace (Task 2.2).
- **Motion a11y.** Canvases autoplay and ignore `prefers-reduced-motion`.

### 0.7 Site-wide issues

1. **`/og.png` does not exist** — `public/` holds only favicons, so every social share
   (LinkedIn/Twitter, i.e. exactly where recruiters see it) gets a broken card image.
2. **Mobile nav never closes** — tapping a menu link scrolls to the anchor but the
   checkbox stays checked, leaving the menu overlaying content.
3. **No smooth scrolling / scroll offset** — anchor jumps are abrupt; no
   `scroll-padding-top` compensating the 64 px sticky header.
4. Hero uses `100vh` → iOS URL-bar jump; should be `svh`/`dvh`.
5. Body scroll-lock relies on the dialog `toggle` event (2024-era API, missing in older
   Firefox/Safari) — lock should happen in the open handler instead.
6. Nav has no **Experience** link and no active-section indication; Experience is buried
   as a second `h2` inside `#skills` (also two `<h2>`s in one section — weak semantics
   and no anchor).
7. Experience/Skills hard-code hex colors (`#89b4fa`, `#a6e3a1`, `#f9e2af`, …) inline
   instead of extending the theme; `Badge` overloads the `progress` variant to mean
   "primary skill".
8. No `robots.txt`, no `sitemap`, no JSON-LD `Person` schema; `meta keywords` is dead
   weight. Site URL `https://filippolollato.dev` is hard-coded — fine, but move to one
   constant (`astro.config` `site` + `Astro.site`).
9. 404 page: content hugs the top (no min-height centering), no personality.
10. Typography is fixed-size (`--text-display: 48px`) — no fluid scale, so the hero reads
    small on desktop and slightly large on phones.

---

## Phase 1 — De-server & correctness (make everything true again)

Goal: `output: 'static'`, zero API routes, all demos work from a `file://`-grade static
host, every displayed number honest. This phase is pure correction — visual work comes later.

### Task 1.1 — Restore static output
- `astro.config.mjs`: set `output: 'static'`; remove `adapter: node(...)` and the
  `@astrojs/node` import; add `site: 'https://filippolollato.dev'`.
- `package.json`: remove `@astrojs/node`; run `npm install` to sync the lockfile.
- Delete `src/pages/api/` entirely (all four files).
- **Accept:** `npm run build` emits `dist/` with only static assets; `grep -r "api/" src`
  returns nothing.

### Task 1.2 — AsaDemo correctness
File: `src/components/AsaDemo.astro` (script section only in this phase).
- Inline the `PHASES` array in the client script with **template literals containing real
  newlines** (or `['line1','line2'].join('\n')`). Delete `fetchPhases()`.
- Phase model fix: give each phase an explicit `agentPath: {from,to} | null` *separate*
  from `previewPath`. Phase 0 gets `previewPath` only (dashed route draws in, agent stays
  at (4,4)); phases 2–4 get `agentPath`.
- Time-based animation: store `phaseStart = performance.now()` and compute
  `t = min((now - phaseStart) / phase.durationMs, 1)`; durations become ms
  (e.g. 80 frames → 1300 ms). Applies to the inter-phase hold too: replace the
  `setTimeout` with a `hold: 800` ms tail inside the phase timeline so pause/restart
  can't race it — one rAF loop, one source of truth, checked against `running` every frame.
- Route following: move the agent along the L-shaped Manhattan path (horizontal leg then
  vertical leg, same shape `drawPath` draws) instead of a straight diagonal lerp.
- Bubble sizing: measure text with `ctx.measureText` per line; bubble width =
  `maxLineWidth + 2*pad`, clamped to canvas.
- Delete dead `ax`/`ay`.
- **Accept:** open demo → agent stands still during "planning" while the dashed route
  draws; bubbles are multi-line with no visible `\n`; pausing during any moment freezes
  everything; Restart never speeds up the animation; speed identical at 60 Hz and 144 Hz
  (test with Chrome DevTools "Rendering → frame rate" or a 144 Hz screen).

### Task 1.3 — SignalDemo correctness & honest metric
File: `src/components/SignalDemo.astro`.
- Inline `rmseLinear`/`rmseCtrv` removal — **do not show canned numbers at all.** Compute
  a real running RMSE over the last N=120 samples of on-screen error:
  `rmse = sqrt(mean(dx²+dy²))`, updated per frame per mode, label it
  `RMSE (this simulation)`. Keep the *real* KITTI result as static copy:
  "On KITTI: 81.5 % RMSE reduction vs linear baseline."
- Replace track 2's modulo path with a continuous closed curve (Lissajous:
  `x = cx + A·sin(ωt)`, `y = cy + B·sin(2ωt + φ)`) — no wrap, no teleport, trail loop
  just works.
- Predictors become small honest simulations rather than hand-tuned drift:
  - `linearPred`: true constant-velocity extrapolation — sample `p(t)` and `p(t-Δ)`,
    project forward `k·Δ`; its error on curves then *emerges* naturally (that's the
    actual pedagogical point). Clamp `t-Δ` to ≥ 0.
  - `ctrvPred`: sample position + heading + turn-rate from the parametric path and
    propagate the CTRV equations one step; use a small *seeded, per-track-constant*
    noise offset instead of per-frame `Math.random()` (no vibration).
- Time-based `t` (ms since start × speed), like Task 1.2.
- Delete `isLinear` dead code. Delete `fetchSignalParams`.
- **Accept:** RMSE figure visibly derives from the gap you can see (toggle modes → number
  responds within ~1 s); no object ever teleports; no artifact lines; values differ
  between runs (it's a real computation).

### Task 1.4 — NluDemo honesty rebuild
File: `src/components/NluDemo.astro`.
- Single source of truth: one `EXAMPLES` const in the component script (server copy is
  gone with `api/nlu.ts`). Fix the `chicago` annotation (`toloc.city_name`, label
  "city") or replace the example with a genuine `airport_name` query.
- **Remove the pretense of live inference.** Replace free-text + "Classify" with an
  explicit example-driven UI:
  - The 5 chips become the primary control ("Pick a query from the ATIS test set").
  - Header/help copy states plainly: *"Pre-computed outputs from my fine-tuned BERT
    model on the ATIS test set — the full training pipeline is in the repo."*
  - Keep a read-only input showing the selected sentence (visual continuity), or drop
    the input entirely — chips + annotated sentence carry the demo.
- Keep the reveal delightful instead of fake-slow: no artificial delay; animate tokens
  annotating one-by-one (~40 ms stagger, CSS transitions), confidence rendered as a
  small horizontal meter that fills.
- Remove `alert()` calls, `findExample`, the fetch, and the dead python comment.
- **Accept:** no input path can display a result that mismatches the shown sentence;
  copy explicitly says outputs are pre-computed; slot labels match ATIS conventions.

### Task 1.5 — KindleDemo transport fix (correct claim, no server)
File: `src/components/KindleDemo.astro` (editor swap is Phase 2; this task fixes the lie
and the transport).
- `compile()` POSTs **directly to `https://play.rust-lang.org/execute`** from the browser
  with body `{ channel: 'stable', mode: 'debug', edition: '2021', crateType: 'bin',
  tests: false, backtrace: false, code }`; response `{ success, stdout, stderr }` maps to
  the existing output panel. (The playground API serves permissive CORS; mdBook's
  editable snippets call it the same way.)
- Precomputed fallback: store the expected rustc output for each of the 3 scenarios
  (captured once, verbatim — e.g. `error[E0308]: mismatched types … expected 'Tensor<128>',
  found 'Tensor<256>'`). If the fetch fails *or* the code equals an unmodified scenario
  and the user is offline, show the stored output with a badge "cached output (network
  unavailable)". Never show fake output for *edited* code — on failure with edited code,
  show the network error.
- Honest framing: header subtitle stays "Real rustc via play.rust-lang.org"; add one line
  under the explanation panel: *"These snippets model kindle's public API pattern —
  the full framework builds on tch-rs."* (the snippets don't import the crate; say so).
- Scenario 2 nit: `l3` is declared and unused → rustc warning noise in output; prefix
  `_l3` or use it, so the error panel shows only the intended shape error.
- **Accept:** with network: real rustc output for edited code; without network: cached
  outputs for pristine scenarios, explicit error for edited code; no request ever hits
  the site's own origin.

### Task 1.6 — Site-wide correctness quickies
- `src/components/Nav.astro`: close mobile menu on link tap — in the existing script,
  `document.querySelectorAll('#site-nav nav a').forEach(a => a.addEventListener('click',
  () => { navToggle.checked = false; }))`.
- `src/styles/global.css`: add
  `html { scroll-behavior: smooth; scroll-padding-top: 80px; }` wrapped so smooth is
  disabled under `prefers-reduced-motion: reduce`.
- `src/components/Hero.astro`: `min-h-[calc(100vh_-_64px)]` → `min-h-[calc(100svh-64px)]`.
- `src/layouts/Layout.astro`: replace the `toggle`-event scroll-lock with locking in
  `ProjectCard`'s open handler (`document.body.style.overflow='hidden'` right after
  `showModal()`) + existing `close` handler unlock; delete the `toggle` listener.
- **Accept:** mobile menu closes on tap; anchored sections land 80 px below viewport top;
  no body scroll behind open dialogs in Firefox ESR.

---

## Phase 2 — Demo shell & per-demo visual rebuild

Goal: one shared, responsive, theme-tokened dialog system; each demo visually polished
and phone-usable.

### Task 2.1 — `DemoDialog.astro` shared shell
New file: `src/components/DemoDialog.astro`.
- Props: `id`, `title`, `subtitle` (slot for links), `maxHeight` (default 700px).
- Markup (Tailwind classes, zero inline styles):
  - `<dialog id={id} aria-labelledby={id+'-title'} class="…">` — the global dialog CSS in
    `global.css` keeps backdrop/animation; add `w-[min(92vw,1100px)]`.
  - Header: `flex items-start justify-between gap-md p-md md:p-lg border-b border-border`
    with `h2.text-body md:text-heading font-semibold` + `p.text-label text-subtext`.
  - Close button: 36 px square, `border border-border rounded-md text-subtext
    hover:text-text hover:border-subtext focus-visible:ring-2 ring-accent/60`, an
    `lucide:x` icon (not the ASCII `×`), `autofocus` so focus lands predictably.
  - Body: `<div class="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">` with
    two named slots: `main` (canvas/editor, `flex-1 min-w-0 min-h-0`) and `aside`
    (`lg:w-[300px] lg:border-l max-lg:border-t border-border overflow-y-auto`).
  - **Mobile behavior:** below `lg` the aside stacks *under* the main area and the whole
    dialog body scrolls (`overflow-y-auto`); dialog takes `h-[92dvh]`.
- One shared script (module, in the component, guarded to run once): close-button wiring
  via `data-dialog-close`, backdrop-click close (move from Layout), body scroll lock, and
  an exported `demo-open` convention (already dispatched by ProjectCard).
- Small helpers file `src/scripts/canvas.ts`:
  - `setupCanvas(canvas, cssW, cssH)` → sets `canvas.width = cssW * devicePixelRatio`,
    CSS size via style, `ctx.scale(dpr, dpr)`; call again on `ResizeObserver` so the
    canvas fills `main` slot width (`min(480px, 100%)` aspect-locked).
  - `motionSafe()` → `!matchMedia('(prefers-reduced-motion: reduce)').matches`; when
    false, demos open **paused** with the Play button pulsing once.
- Refactor all four demos onto the shell; sidebar content (legend / metrics /
  architecture notes) becomes Tailwind-classed markup. Shared sidebar sub-patterns:
  `.demo-kicker` (11px uppercase tracking-wide subtext) and metric rows — define as
  two small utility classes in `global.css` rather than repeating chains 20×.
- Buttons inside demos: reuse site button styles — primary (`bg-accent text-base`),
  ghost (`border-border text-subtext hover:border-accent/40`); replace emoji glyphs
  (⏸ ▶ ↺ ×) with lucide icons (`pause`, `play`, `rotate-ccw`, `x`) for visual
  consistency — Astro `Icon` renders inline SVG at build time, works inside dialogs.
- **Accept:** all four dialogs render correctly at 360 px, 768 px, 1280 px widths; axe
  reports no violations on an open dialog; `grep 'style="' src/components/*Demo*.astro`
  ≈ zero hits (allow canvas sizing attrs).

### Task 2.2 — Kindle demo: self-hosted editor + output design
- Replace CDN Monaco with **CodeMirror 6**, bundled from npm and lazy-loaded on first
  `demo-open` via dynamic `import()` (Vite code-splits automatically):
  packages `codemirror`, `@codemirror/lang-rust`; theme: define a small Catppuccin
  Mocha `EditorView.theme` (bg `--color-base`, selection accent/20, JetBrains Mono 13px).
  ~150 kB gz vs Monaco's ~2 MB, no external requests, matches site fonts.
- Delete the jsdelivr `<link>` and loader script entirely.
- Scenario tabs → segmented control matching site tokens: container
  `border border-border rounded-md p-[3px] gap-xs`, active tab `bg-accent/15 text-accent
  border-accent` (drop the ❌/✅ from tab labels; instead show a colored status dot —
  red `--color-destructive` for error scenarios, green for the passing one).
- Output panel design: terminal look — header row "rustc output" with a copy button;
  ANSI-ish coloring by parsing rustc output lines: `error[...]`/`error:` → destructive,
  `warning:` → `#f9e2af`, `-->` locations → subtext, success line → green. Simple
  line-prefix regex, no dependency.
- Compile button: primary style with `lucide:play`; while compiling show inline spinner
  (CSS border spinner) + "Compiling on play.rust-lang.org…"; disable during flight.
- Editor/output split: `lg:flex-row` 60/40; on mobile editor 300 px tall, output below.
- **Accept:** no request to any CDN; first open loads editor chunk < 200 kB gz; rustc
  errors render with red highlights and clickable-looking spans; works at 360 px.

### Task 2.3 — ASA demo visuals
- Canvas: responsive via `setupCanvas`; grid re-derives cell size from actual canvas size.
- Replace emoji sprites with crisp vector drawing (emoji render inconsistently across
  OSes): keep emoji as fallback but prefer drawn glyphs — agent: rounded square in
  accent with two "eyes" (8 lines of canvas code); restaurant: mantle circle + 🍕 emoji
  is acceptable *if* kept, but consistent sizing via `drawEmoji` with
  `textBaseline='middle'` and per-DPR font size. (Decision: keep emoji — they read
  instantly — but draw the agent as a vector so the glow + carried-package badge track
  cleanly.)
- Phase timeline UI in the sidebar: 5 steps (Plan → Assign → Pickup → Deliver → Done) as
  a vertical stepper; current step accent-highlighted, completed steps get check icons —
  replaces the single-line action log, shows the 3-layer architecture story at a glance.
  Keep the mono action log line under the stepper.
- Delivered celebration: expanding green ring + "+10" floating text (already half-built
  via `deliveredFlash`; finish it).
- Restart/Pause buttons: lucide icons, ghost style, sit in a footer bar under the canvas.
- **Accept:** stepper mirrors phases exactly; animation legible at 360 px (sidebar below
  canvas); no emoji-metrics jank on Linux/ChromeOS (test locally).

### Task 2.4 — Signal demo visuals
- Mode toggle: same segmented-control pattern as kindle tabs; red/green tinting kept.
- Metrics panel: live RMSE as a **dataviz-correct stat tile** — big mono number, small
  label, colored delta arrow vs the other mode's running RMSE ("−81 % vs Linear" when
  CTRV selected, computed live from both running values, both trackers simulated every
  frame regardless of displayed mode so the comparison is always current).
- Add a small live sparkline (last ~100 RMSE samples, 120×28 canvas) under the stat —
  instantly communicates "linear drifts on curves, EKF doesn't".
- Scene polish: darker grid (`--color-mantle` lines at 0.35), soft vignette, per-track
  color-matched trail with fading alpha tail (draw trail with per-segment alpha ramp).
- Uncertainty visualization: draw a dashed ellipse around the prediction whose radius =
  recent per-track error stddev — visually explains *why* linear is worse.
- **Accept:** toggling modes changes both the number and the sparkline shape; the −x %
  figure is computed, not hard-coded; 360 px layout stacks cleanly.

### Task 2.5 — NLU demo visuals
- Chips → "example cards" row: each chip shows the query short-name + intent tag color
  dot; selected state accent-bordered.
- Annotated sentence: token pills animate in with 40 ms stagger (CSS
  `transition-delay` via inline custom property `--i`); slot pills keep the
  color-underline+label pattern but move label rendering to a `<ruby>`-like stacked
  layout with fixed line-height so rows don't jitter (`line-height: 2.2` today causes
  uneven baselines when labels wrap).
- Confidence: horizontal meter (width = confidence %, accent fill, mono % label) instead
  of plain text.
- Add a compact "how it works" footer strip: `BERT → [CLS] intent head · token slot head`
  as a mini architecture diagram in text/SVG, 2 lines max.
- **Accept:** picking any example animates tokens in order; nothing implies live
  inference; meter width matches the number.

---

## Phase 3 — Site-wide visual overhaul (element by element)

Goal: sharper hierarchy, fluid type, consistent tokens, more "designed" feel — without
losing the fast/minimal character.

### Task 3.1 — Design tokens & global styles (`src/styles/global.css`)
- **Fluid type scale** (replace fixed px):
  - `--text-display: clamp(2.5rem, 1.5rem + 4vw, 4.25rem)` (40→68px), lh 1.05,
    letter-spacing `-0.02em`.
  - Add `--text-title: clamp(1.5rem, 1.2rem + 1vw, 1.75rem)` for card/dialog headings
    (replaces overloaded `text-heading` at 28px in cards — cards drop to `text-title`).
  - Keep `--text-heading` for section sub-lines; keep body/label.
- **New color tokens** (Catppuccin Mocha, replacing scattered hex):
  `--color-blue: #89b4fa; --color-green: #a6e3a1; --color-yellow: #f9e2af;
  --color-peach: #fab387; --color-sky: #89dceb; --color-teal: #94e2d5;
  --color-crust: #11111b;` — then sweep `Skills.astro`, demo sidebars, canvas scripts to
  reference `var(--color-*)` (canvas reads them via
  `getComputedStyle(document.documentElement).getPropertyValue(...)` once at init).
- **Radius + shadow tokens:** `--radius-card: 10px; --radius-control: 8px;` apply via
  Tailwind `rounded-[var(--radius-card)]` or extend theme; one elevation shadow token
  for cards and dialogs.
- **Texture:** add a body-wide fixed subtle noise overlay (inline SVG `feTurbulence`
  data-URI at 2–3 % opacity, `pointer-events-none`) — kills the flat-fill look on large
  dark areas; verify no banding/perf issue, else drop.
- **Selection & scrollbar:** `::selection { background: rgb(203 166 247 / .30); }`;
  thin themed scrollbar (`scrollbar-width: thin; scrollbar-color: var(--color-border)
  transparent;` + WebKit rules).
- **Section header pattern:** utility class `.section-eyebrow` (mono, 12px, uppercase,
  tracking `0.15em`, accent, with a leading 24px horizontal rule) used by every section
  above the `h2` — e.g. `01 · WORK`, `02 · SKILLS`, `03 · CONTACT`. Adds rhythm and a
  designed signature with ~zero cost.
- **Accept:** `grep -c '#cba6f7\|#a6adc8\|#313244' src/components` drops to ~0 outside
  global.css; hero display renders ≥64px at 1440 w and ≤44px at 375 w.

### Task 3.2 — Nav
- Add **Experience** link (after Skills) in both desktop and mobile menus (target
  `#experience`, created in Task 3.5).
- **Scroll progress bar:** 2px absolute bottom bar in accent, `transform: scaleX(p)`
  with `transform-origin: left`, updated in the existing scroll handler
  (`p = scrollY / (scrollHeight - innerHeight)`), `will-change: transform`.
- **Active section highlight:** IntersectionObserver over `#projects #skills #experience
  #contact` (rootMargin `-40% 0px -55%`), toggles `aria-current="true"` on the matching
  link; style `[aria-current] { color: var(--color-accent); }` + a 3px underline dot.
- `is-scrolled` state: also add `shadow-[0_4px_20px_rgb(0_0_0/0.25)]` and shrink header
  64→56px (`transition: height .25s`) for a compact scrolled state (adjust
  `scroll-padding-top` to 72px).
- Brand link: on hover reveal `.dev` suffix? Skip — keep name plain, but set it in mono
  with an accent `~/` prefix (`~/filippo-lollato`) for a terminal signature. (Cheap,
  distinctive, on-theme for a systems person. If it reads gimmicky in review, revert to
  plain text — 1-line change.)
- **Accept:** progress bar tracks scroll exactly; active link follows sections while
  scrolling; keyboard tab order unchanged; menu closes on tap (from 1.6).

### Task 3.3 — Hero
- Name: apply `gradient-text` to `h1` (text 20% → accent 100% — same treatment as
  section headings so the page has one gradient signature), with fluid display size
  from 3.1.
- Subheadline: drop from `text-heading font-semibold` to `clamp(1.125rem,~,1.375rem)`
  `font-normal text-subtext` — today it competes with the h1; let the two `text-text`
  spans inside carry the emphasis. Remove the hard `<br/>`s; use `max-w-[38rem]
  text-balance` instead (manual breaks fight small screens).
- Add a **stats strip** under the CTAs (before scroll cue): three mono micro-stats with
  top border — `81.5% ↓ RMSE (KITTI)` · `0.9765 intent acc (ATIS)` · `~91.5% test cov
  (ASA)` — each anchor-links to its project card. Instantly answers "credible depth?"
  within the 60-second recruiter window. `hero-animate` delay 5; scroll cue becomes
  delay 6.
- Blob upgrade: add a **very slow hue-shifted second layer** (blue `--color-blue` at
  0.05) behind the accent blobs for depth; add gentle mouse parallax (`transform:
  translate(x*8px, y*8px)` on `pointermove`, lerped, disabled when
  `prefers-reduced-motion` or coarse pointer).
- Dot grid: add a radial mask so dots fade toward edges
  (`mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)`).
- **Accept:** h1 gradient legible (contrast ≥ 4.5:1 across the gradient run — check the
  lightest stop); stats strip links scroll to correct cards; parallax inert on touch +
  reduced-motion; no layout shift from font swap (see 4.4).

### Task 3.4 — About pillars
- Restructure each pillar: grid `grid-cols-[40px_1fr] gap-x-sm` so body text aligns
  under the heading, not the fragile `pl-[52px]`.
- Card treatment: on hover, icon box fills accent (`bg-accent text-base`) with 0.2s
  transition — small delight, no movement.
- Numbers inside pillar bodies (`~91.5%`, `81.5%`, `0.9765`) get `font-mono
  text-accent` spans — scannability.
- Heading semantics: pillar titles become `h3` (currently `h2` × 3 without a section
  heading above them — screen-reader outline is noisy); add `aria-label="How I work"`
  on the section or a visually-hidden `h2`.
- **Accept:** text alignment holds at all widths; outline (devtools a11y tree) shows one
  h2 per section.

### Task 3.5 — Projects section & cards
- **Flagship card:** kindle spans 2 columns on `lg` (`lg:col-span-2`) with a two-column
  inner layout: left = existing content; right = a small static code snippet
  (`Linear<128,64>` + the error line, 8 lines, pre-highlighted spans, mono 12px, in a
  `bg-base` inset with the rustc error in destructive color). It's the differentiator
  project; give it visual rank. Grid stays `lg:grid-cols-3`, remaining 5 cards fill.
- Card redesign (`ProjectCard.astro`):
  - Name row: add a mono index (`01`…`06`, subtext) before the name; name drops to
    `text-title` (from 3.1).
  - `role` line: mono, 12px, subtext.
  - Impact callout: keep left-accent bar, set number-parts in mono; tighten to one line
    where possible.
  - Tech badges: reduce to `text-[12px] px-2 py-0.5` (14px pills currently crowd);
    cap visible badges at 4 with `+n` overflow badge (data already short — apply only
    where needed).
  - Footer: **Try Demo becomes the primary action** (recruiter-value order): solid
    accent button; GitHub link becomes the secondary ghost link. Cards without a demo
    keep GitHub as primary style.
  - Hover: existing `card-hover` lift + add top-edge gradient line
    (`::before` 2px gradient accent→transparent, opacity 0→1 on hover).
- Section header: eyebrow `01 · WORK` (3.1 pattern); keep the "Try Demo" hint line.
- "More on GitHub": add repo language dot (hardcode color per repo: Rust orange
  `#dea584`, etc.) inside each chip + `lucide:arrow-up-right` 12px suffix.
- **Accept:** kindle card visually dominant on desktop, normal card on mobile; tab
  order: card → demo → github; all six cards equal height per row.

### Task 3.6 — Skills
- Section eyebrow `02 · SKILLS`. Keep 4-group grid.
- Badge component: add real `variant: 'primary'` (accent border + accent/10 bg + accent
  text) and use it for primary skills; `progress` variant reverts to its semantic
  (In-Progress chip on cards). Touch: `Badge.astro`, `Skills.astro`, `ProjectCard.astro`.
- Group cards: replace inline `style="border-left-color:…"` with token classes; add the
  group icon into a small tinted square (same pattern as About pillars) for visual
  continuity.
- Optional texture: faint diagonal hairline pattern in card corners — skip unless trivial.
- **Accept:** no inline styles left in Skills; primary skills visually distinct from
  in-progress badges elsewhere.

### Task 3.7 — Experience → own section with timeline
- Split out of Skills into `src/components/Experience.astro`; `<section id="experience">`;
  register in `index.astro` and Nav. Eyebrow `03 · EXPERIENCE`.
- **Timeline layout:** left rail (2px `border-border` vertical line, absolute) with a
  10px dot per entry (dot color = entry tag color token); entries indented `pl-xl`;
  period stays right-aligned on `sm+`, moves above title on mobile.
- Entry cards lose the full border — become borderless rows with `hover:bg-mantle/50`
  rounded; the timeline rail carries the structure (lighter, more editorial than three
  stacked boxes).
- Tag pill: tokened colors (`--color-blue`, `--color-green`, accent) instead of hex
  string interpolation.
- **Accept:** rail aligns through all entries at every breakpoint; hex-interpolated
  `style=` attributes gone.

### Task 3.8 — Contact & Footer
- Contact becomes the **closing statement**: eyebrow `04 · CONTACT`, then an oversized
  `text-display` line — "Let's build something correct." — then the existing paragraph
  at `max-w-[40rem]`.
- Email row: keep mailto primary button; add a **copy-email ghost button**
  (`lucide:copy` → on click `navigator.clipboard.writeText`, icon swaps to `check` for
  1.5s). Recruiters copy-paste into ATS tools; mailto alone is hostile on desktop.
- Add a subtle availability line: mono, green dot (`animate-pulse`, motion-safe) +
  "Open to internships & research collaborations — Trento / remote." (confirm wording
  with Filippo before shipping; placement designed regardless).
- Footer: add center column of quick links (Projects · Skills · Experience · Contact),
  and a "Back to top ↑" link right-aligned; keep © line. Note "Built with Astro — no
  trackers, no cookies." (true and on-brand).
- **Accept:** copy button works over https and shows feedback; footer 3-zone layout
  collapses cleanly on mobile.

### Task 3.9 — 404
- Center vertically: `min-h-[calc(100svh-64px)] flex items-center justify-center`.
- Content: giant mono `404` in accent/20 outline style behind, foreground line
  "route not found — this page never compiled." + primary button home. 10 minutes of
  work, memorable, on-voice.
- **Accept:** looks intentional at mobile + desktop; passes contrast.

---

## Phase 4 — SEO, sharing, performance, a11y hardening

### Task 4.1 — OG image (`public/og.png`)
- Create 1200×630 PNG: base `#1e1e2e`, faint dot grid, name in Inter semibold ~72px,
  tagline "Systems ML · Rust · Robotics — University of Trento", accent gradient bar.
  Generate via a throwaway HTML file rendered headless (Playwright screenshot) or any
  editor — checked into `public/`. Also `public/og-project.png` not needed (single page).
- **Accept:** file exists, < 200 kB; `opengraph.xyz`-style preview shows correctly
  (verify with a local meta checker or manual tag inspection).

### Task 4.2 — Meta & structured data (`Layout.astro`)
- Remove `meta keywords`. Add `theme-color #1e1e2e`.
- Add JSON-LD `Person`: name, url, affiliation "University of Trento", sameAs
  [github.com/xupremix], jobTitle "ML Student & Systems Developer", email (mailto).
- Use `Astro.site` (set in 1.1) for canonical/OG instead of the local `siteUrl` const.
- Add `public/robots.txt` (`Allow: /`, sitemap line) + `@astrojs/sitemap` integration
  (static-compatible, zero runtime).
- **Accept:** `npm run build` emits `sitemap-index.xml`; JSON validates in Google's
  Rich Results test schema (or `schema.org` validator offline equivalent).

### Task 4.3 — Fonts & loading
- Trim fontsource imports to exactly the weights used post-overhaul (expect: Inter
  400/600, JetBrains Mono 400/600 — audit; mono 600 currently the only mono import but
  demos use regular-weight mono → add 400, or standardize on 600).
- Preload the two critical woff2 files (`<link rel="preload" as="font" crossorigin>`)
  in Layout head; keep `font-display: swap` defaults.
- **Accept:** no FOIT; Lighthouse "font-display" audit clean; no 404s on font files.

### Task 4.4 — Performance & a11y verification (gate for the whole overhaul)
- Budgets: initial JS < 40 kB gz (site without demos — currently near-zero, keep it);
  demo chunks lazy; total page weight < 350 kB excluding demo chunks; CLS < 0.02,
  LCP < 1.5s local throttled.
- Checks (each is a task-level acceptance step):
  1. `npm run build && npm run preview` — click through every section + all four demos
     at 360/768/1440 px.
  2. Keyboard-only pass: tab through nav → cards → open each dialog → Esc closes →
     focus returns to trigger (add explicit focus-return in shared dialog script if
     `showModal` restoration proves unreliable).
  3. `prefers-reduced-motion` emulation: no autoplaying canvas, no parallax, no smooth
     scroll, reveals appear instantly.
  4. axe DevTools (or `@axe-core/cli` against preview): 0 critical/serious.
  5. Lighthouse: ≥ 95 across Performance / A11y / Best Practices / SEO.
  6. Grep gates: no `style="` in section components; no `/api/` references; no CDN URLs.

---

## Execution order & sizing

| Phase | Task | Size | Depends on |
|---|---|---|---|
| 1 | 1.1 static restore | S | — |
| 1 | 1.2 ASA correctness | M | 1.1 |
| 1 | 1.3 Signal honesty | M | 1.1 |
| 1 | 1.4 NLU honesty | M | 1.1 |
| 1 | 1.5 kindle transport | M | 1.1 |
| 1 | 1.6 site quickies | S | — |
| 2 | 2.1 DemoDialog shell | L | 1.2–1.5 |
| 2 | 2.2 kindle editor | L | 2.1 |
| 2 | 2.3 ASA visuals | M | 2.1 |
| 2 | 2.4 Signal visuals | M | 2.1 |
| 2 | 2.5 NLU visuals | M | 2.1 |
| 3 | 3.1 tokens/global | M | — (parallel with 2) |
| 3 | 3.2 Nav | M | 3.1 |
| 3 | 3.3 Hero | M | 3.1 |
| 3 | 3.4 About | S | 3.1 |
| 3 | 3.5 Projects/cards | L | 3.1 |
| 3 | 3.6 Skills | S | 3.1 |
| 3 | 3.7 Experience timeline | M | 3.1, 3.2 |
| 3 | 3.8 Contact/Footer | S | 3.1 |
| 3 | 3.9 404 | S | 3.1 |
| 4 | 4.1 OG image | S | 3.3 (visual language settled) |
| 4 | 4.2 meta/sitemap | S | 1.1 |
| 4 | 4.3 fonts | S | 3.x |
| 4 | 4.4 verification gate | M | everything |

Phase 1 is the non-negotiable start: it removes a security hole, restores the
deployability constraint, and makes every number on the site true. Phases 2 and 3 can
interleave; Phase 4 gates shipping.

## Decisions deliberately made in this plan (flag if you disagree)

1. **Kindle compiles via play.rust-lang.org from the browser** (honest, serverless)
   rather than any self-hosted compile service.
2. **NLU demo drops free-text input** — honesty over interactivity. In-browser real
   inference (transformers.js + quantized distilled model) is possible but adds ~20 MB
   of downloads; rejected for a recruiter-facing static site. Could be a labeled
   "heavy mode" later.
3. **Signal RMSE becomes a real simulation metric** with the KITTI 81.5 % kept as a
   clearly-labeled static claim — never as the live number.
4. **CodeMirror 6 replaces Monaco** (self-hosted, 13× smaller, themeable to Catppuccin).
5. **Terminal-flavored brand mark + numbered section eyebrows** as the site's visual
   signature — cheap, distinctive, consistent with a systems-ML identity.
