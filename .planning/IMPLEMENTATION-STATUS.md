# Implementation Status — Design Overhaul

> **Read this first.** This file is the single source of truth for the design-overhaul
> implementation. It is written so ANY agent (human or model) can pick up work with zero
> other context. The full rationale for every change lives in
> `.planning/DESIGN-OVERHAUL-PLAN.md` — task numbers below reference that plan.
>
> **Rules for whoever continues this work:**
> 1. Work top-to-bottom through the task table. One task = one commit.
> 2. After finishing a task: build (`npm run build`), commit, then update this file
>    (flip status, fill commit hash) in the same commit or a follow-up `docs:` commit.
> 3. Never add server code (`src/pages/api/` must not exist; `astro.config.mjs` stays
>    static, no adapter). Never show a number that isn't computed or real.
> 4. All colors/fonts come from tokens in `src/styles/global.css` (`--color-*`,
>    `--text-*`). NO hex values or `style=""` attributes in components.
>    Canvas code reads tokens via `themeColor()` from `src/scripts/canvas.ts`.
> 5. No AI co-author trailers in commits (project rule).

## Branch / environment

- Branch: `worktree-design-overhaul-plan` (worktree of the portfolio repo).
- No git remote exists. Do not try to push.
- Commands: `npm run build` (must pass after every task), `npm run dev` (manual check),
  `npm run preview` (serve the built site).

## Task table

| # | Task | Status | Files | Commit |
|---|------|--------|-------|--------|
| 1 | Install deps (codemirror, @codemirror/lang-rust, @astrojs/sitemap) | DONE | package.json | (with task 3) |
| 2 | Global tokens & styles | DONE | src/styles/global.css | 06835ce* |
| 3 | DemoDialog shell + canvas helpers | DONE | src/components/DemoDialog.astro, src/scripts/canvas.ts, src/layouts/Layout.astro, src/components/ProjectCard.astro | see git log |
| 4 | Kindle demo rebuild | DONE | src/components/KindleDemo.astro, src/scripts/kindle-demo.ts, src/scripts/rust-editor.ts, src/demo-code/kindle/*.rs, src/generated/kindle-outputs.json, scripts/capture-kindle-outputs.mjs | see git log |
| 5 | ASA demo rebuild | DONE | src/components/AsaDemo.astro, src/scripts/asa-demo.ts | see git log |
| 6 | Signal demo rebuild | DONE | src/components/SignalDemo.astro, src/scripts/signal-demo.ts | see git log |
| 7 | NLU demo rebuild | DONE | src/components/NluDemo.astro (uses REAL ATIS test rows + real report metrics; no separate ts file needed) | see git log |
| 8 | Nav upgrade | DONE | src/components/Nav.astro | see git log |
| 9 | Hero upgrade | DONE | src/components/Hero.astro | see git log |
| 10 | About + Projects flagship + Skills/Badge | DONE | About.astro, Projects.astro, ProjectCard.astro, Skills.astro, Badge.astro | see git log |
| 11 | Experience split + Contact/Footer + 404 | DONE | Experience.astro (new), Contact.astro, Footer.astro, 404.astro, index.astro | see git log |
| 12 | SEO/OG/sitemap/fonts | DONE | Layout.astro, astro.config.mjs, public/og.png, public/robots.txt, scripts/generate-og.mjs, package.json (og + capture:kindle scripts) | see git log |
| 13 | Verification gate | DONE | scripts/visual-check.mjs (screenshot driver, reusable) | see git log |

## Verification results so far (task 13)

- `npm run build` clean; dist 1.5M total.
- Grep gates PASS: 0 `style="` attrs, 0 `/api/` refs, 0 CDN refs; only raw hex left
  is the `theme-color` meta (can't use CSS vars there — allowed).
- All 14 anchors/ids present in dist/index.html (sections, demos, project-* deep links,
  nav-progress). 404.html present and served with real 404 status; og.png + robots 200.
- Bundle budgets PASS: initial JS 8.8 KB gz; CodeMirror lazy chunk 155 KB gz
  (loads only when kindle demo opens); CSS 22.8 KB gz.
- Screenshot review (desktop 1440 + mobile 390, via `node scripts/visual-check.mjs <port>`
  with SHOT_DIR set): hero, all sections, all four demo dialogs, mobile dialog, 404 —
  all reviewed. Zero page JS errors across every page/dialog interaction.
- Bugs found by screenshots and FIXED: `.section-eyebrow` was inline-flex (overlapped
  headings) → block flex; DemoDialog main area collapsed on mobile (`flex-1 min-h-0`
  in stacked scroll) → `max-lg:flex-none`; signal RMSE window polluted by sim warm-up
  samples → warm-up guard before sampling.
- WATCH OUT: a stale preview/dev server from the MAIN checkout may be running on common
  ports (it serves the OLD site with a Plausible script). Always preview on a random
  high port. Also: the new footer says "no trackers" — if Plausible is added later,
  reword that line.

*Commit hashes: run `git log --oneline` to confirm; fill in when updating.

## Round 2 additions (July 18, evening)

- **Kindle demo targets the dev/refactor crate** at `~/kindle` (branch `dev/refactor`;
  NOT `~/Projects/kindle`, which is the pre-refactor repo). Scenarios use the new API
  (`s![...]` typenum shapes, `kindle::candle::CandleBackend`, `Sequential`/`seq!`,
  `#[module]`, per-tensor dtypes). Captured outputs: real `EndsWith` E0277 shape error,
  E0308 f32/f64 dtype error, and a run on the Candle backend (`shape=[2, 10]`).
  Capture script default `KINDLE_PATH=~/kindle`, mirrors the repo's toolchain (stable),
  only injects tch/download-libtorch when the target lock mentions tch.
- **Design modes**: `ink` (default, current terminal look) ↔ `paper` (warm paper,
  serif display, moss-green accent) toggled from the nav (leaf/terminal icon),
  persisted in localStorage (`design-mode`), restored pre-paint in Layout head.
  Everything flows from the `--color-*` tokens; paper-specific overrides live in
  global.css (`html[data-mode='paper']`) + Hero blob/dot overrides; canvases read
  tokens per frame (use `withAlpha(themeColor(...))`, never hardcoded rgb).
- Hero stats strip → compact **proof chips** (bordered pills, inline number+label).
- `scripts/mode-check.mjs` screenshots paper mode; `scripts/visual-check.mjs` ink mode.

## What each remaining task must do (condensed — full detail in DESIGN-OVERHAUL-PLAN.md)

### Task 3 — DemoDialog shell (§2.1 of plan)
- DONE: `DemoDialog.astro` (props `id`, `title`, `subtitle`; slots `main`, `aside`;
  shared script handles close-buttons via `[data-dialog-close]`, backdrop-click close,
  body scroll unlock on close).
- DONE: `src/scripts/canvas.ts` (`setupCanvas` = DPR-aware responsive canvas,
  `motionSafe()`, `themeColor(name)`).
- REMAINING: remove the old dialog script from `Layout.astro` (backdrop + toggle
  listeners — now owned by DemoDialog); scroll-lock happens in `ProjectCard.astro`'s
  open handler (`document.body.style.overflow='hidden'` after `showModal()`).

### Task 4 — Kindle — DONE (design changed per user instruction: use the REAL library)
Final architecture (all implemented):
- Tabs 1–3 show REAL kindle API code (`src/demo-code/kindle/0{1,2,3}-*.rs`, single
  source of truth imported `?raw`). Their rustc output CANNOT be produced live
  (kindle links libtorch; playground can't build it; this machine lacks libssl-dev),
  so output comes from `src/generated/kindle-outputs.json`, produced by
  `npm run capture:kindle` against the real crate. **CAPTURED (July 2026)** with
  rustc nightly 1.94: real E0277 `Forward<IN,OUT>` trait errors for scenarios 1–2,
  scenario 3 compiled and ran (`Tensor[dims 2, 10; f32]`). The script needed and now
  has: `download-libtorch` feature via cargo feature unification, a persistent build
  cache at `~/.cache/kindle-demo-capture`, kindle's own `Cargo.lock` seeded into the
  scratch project (a fresh resolve breaks kindle-core with duplicate safetensors),
  and local-path sanitization. Re-runs take seconds thanks to the cache.
- Tab 4 "Sandbox · live rustc": self-contained const-generics pattern, editable,
  compiles live on play.rust-lang.org from the browser; offline fallback shows a
  pre-captured real rustc output only if the code is unedited.
- Editor: self-hosted CodeMirror 6, lazy chunk (469K raw, loads on first open),
  Catppuccin theme in `src/scripts/rust-editor.ts`. Zero CDN references.

### Task 5 — ASA (§0.3, §1.2, §2.3)
Key bugs to fix in rewrite: agent must NOT move during phase 0 (planning) — separate
`previewPath` (dashed line only) from `agentPath` (movement); time-based animation
(`performance.now()`, durations in ms — NOT per-frame `+= 1`); NO `setTimeout` between
phases (fold an 800 ms hold into each phase timeline; single rAF loop checks `running`);
agent follows the L-shaped path (horizontal leg then vertical), not a diagonal lerp;
bubble width from `ctx.measureText`; sidebar becomes a 5-step vertical stepper
(Plan → Assign → Pickup → Deliver → Done). Use `setupCanvas` from canvas.ts.

### Task 6 — Signal (§0.4, §1.3, §2.4)
The displayed RMSE must be COMPUTED from on-screen error (running window ~120 samples,
both trackers simulated every frame), never a constant. Keep "81.5% on KITTI" only as
static labeled text. Replace track 2's modulo path with a closed Lissajous curve (no
teleport). linearPred = real constant-velocity extrapolation (clamp t-Δ ≥ 0);
ctrvPred = CTRV propagation with per-track constant offset (no per-frame Math.random).
Sidebar: stat tile (big mono RMSE) + computed % delta vs other mode + 100-sample
sparkline canvas. Use `setupCanvas`.

### Task 7 — NLU (§0.5, §1.4, §2.5)
DELETE free-text input + `findExample` + `|| EXAMPLES[0]` fallback — example chips are
the ONLY input. Copy must say outputs are pre-computed from the trained model on ATIS
test data. Fix `chicago` slot: `airport_name` → `toloc.city_name` (label "to city").
Token pills animate in with staggered delay; confidence shown as a filled meter bar.

### Task 8 — Nav (§3.2)
Add Experience link (desktop + mobile). Close mobile menu when a link is tapped
(uncheck `#nav-toggle`). 2px scroll progress bar (scaleX transform). Active-section
highlight via IntersectionObserver → `aria-current`. Compact scrolled state (64→56px).
Brand mark: mono `~/filippo-lollato`.

### Task 9 — Hero (§3.3)
`gradient-text` on the h1. Subheadline: normal weight, `text-balance`, no `<br/>`.
Stats strip (3 mono metrics linking to project cards: 81.5% RMSE ↓ KITTI / 0.9765
intent acc ATIS / ~91.5% test cov ASA). Blue second blob layer + pointer parallax
(disabled for reduced-motion & coarse pointers). Dot grid gets radial mask fade.
`min-h-[calc(100svh-64px)]`.

### Task 10 — About/Projects/Skills (§3.4–3.6)
About: `grid-cols-[40px_1fr]` alignment, pillar headings h3, hover fills icon box,
metrics in mono accent. Projects: `.section-eyebrow` ("work"), kindle card
`lg:col-span-2` with inline pre-highlighted code snippet, card index numbers, name at
`text-title`, Try Demo = primary accent button, GitHub = ghost link, hover top gradient
line, language dots on GitHub chips. Badge: add `primary` variant (accent tint);
`progress` reverts to in-progress meaning only.

### Task 11 — Experience/Contact/Footer/404 (§3.7–3.9)
New `Experience.astro` (`<section id="experience">`, timeline rail + dots, tokened tag
colors, no inline hex) — remove Experience block from Skills.astro; register in
index.astro. Contact: display-size closing line, copy-email button
(navigator.clipboard + icon swap feedback), availability line (CONFIRM WORDING with
Filippo). Footer: quick links + back-to-top + "Built with Astro — no trackers".
404: centered `min-h-[calc(100svh-64px)]`, big outlined mono 404, "this page never
compiled." copy.

### Task 12 — SEO/OG/fonts (§4.1–4.3)
`scripts/generate-og.mjs`: inline SVG → sharp → `public/og.png` (1200×630, dark bg,
name + tagline + accent bar; sharp is already a transitive dep of Astro). Layout: drop
`meta keywords`, add `theme-color`, JSON-LD Person, use `Astro.site`. astro.config:
`site: 'https://filippolollato.dev'` + `@astrojs/sitemap` integration (installed).
`public/robots.txt` with sitemap line. Fonts: import exactly Inter 400/600 + JetBrains
Mono 400/600; preload the two most-used woff2 in Layout head.

### Task 13 — Verification gate (§4.4)
1. `npm run build` clean. 2. Preview + check every section & demo at 360/768/1440.
3. Grep gates: `grep -rn "style=\"" src/components` ≈ 0; `grep -rn "/api/\|jsdelivr\|cdn\." src` = 0.
4. Keyboard: tab through nav/cards/dialogs, Esc closes, focus returns.
5. Reduced-motion: demos open paused, no parallax/smooth-scroll.
