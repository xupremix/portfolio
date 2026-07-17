---
phase: 01-foundation-shell
plan: 02
subsystem: ui
tags: [astro, tailwindcss, astro-icon, lucide, accessibility, nav, shell]

# Dependency graph
requires:
  - phase: 01-foundation-shell (01-01)
    provides: "Buildable Astro 7 + Tailwind v4 project with 24-token @theme static design system, self-hosted fonts, astro-icon/Lucide tooling"
provides:
  - "Site-wide shell: sticky Nav.astro (scroll-triggered background swap, desktop links + accent CTA, keyboard-operable CSS-only mobile hamburger) and Footer.astro (copyright + TODO(phase-4)-marked GitHub/email icon-links)"
  - "Badge.astro pill primitive (default/progress variants), unconsumed until Phase 3"
  - "Layout.astro base HTML shell — sole import site for global.css + font CSS, wires Nav + slot + Footer"
  - "Real index.astro homepage and 404.astro error page, both using Layout, structurally identical nav/footer"
affects: ["02", "03", "04", "05"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS-only mobile nav toggle: hidden checkbox (#nav-toggle) + peer-checked: Tailwind variant, with sibling <label>s given tabindex/role=button + a shared inline <script> keydown handler for full keyboard operability"
    - "Layout.astro is the single import site for global.css and @fontsource CSS — no other file imports them directly"
    - "Astro inline <script> blocks may use TypeScript type annotations (querySelector<T>) — stripped by Astro's Vite pipeline, no separate .ts file needed"

key-files:
  created:
    - src/components/Nav.astro
    - src/components/Footer.astro
    - src/components/Badge.astro
    - src/layouts/Layout.astro
    - src/pages/404.astro
  modified:
    - src/pages/index.astro

key-decisions:
  - "Nav's scroll-listener + keyboard-toggle logic share one inline <script> block (no separate script file) — matches UI-SPEC's 'keep JS to near-zero' constraint"
  - "Deferred full visual/keyboard human-check (Catppuccin Mocha rendering, scroll-swap, hamburger open/close, focus rings) to end-of-phase verification per config.json human_verify_mode: end-of-phase — this plan has no checkpoint:human-verify task, so it ran fully autonomously (Pattern A) and used npm run build + a temporary npm run dev + curl smoke test for automated confirmation instead of a blocking checkpoint"

requirements-completed: [SETUP-02, SETUP-03]

coverage:
  - id: D1
    description: "Visiting / shows the full dark Catppuccin-Mocha shell (Nav + Footer) instead of unstyled/default HTML"
    requirement: "SETUP-02"
    verification:
      - kind: other
        ref: "npm run build && grep -c 'id=\"site-nav\"' dist/index.html (=1); npm run dev + curl http://localhost:4321/ confirmed compiled @theme tokens (--color-base, --color-accent, etc.) present in served HTML"
        status: pass
      - kind: manual_procedural
        ref: "Visual confirmation that colors read as dark charcoal-navy + pastel-lavender (not generic dark gray) requires a human viewing the rendered page"
        status: unknown
    human_judgment: true
    rationale: "Automated checks confirm the correct CSS custom properties and nav/footer markup are served, but actual color/visual-identity confirmation needs human eyes on a rendered browser (no chromium-cli/playwright available in this environment to screenshot). Deferred to end-of-phase per config.json human_verify_mode: end-of-phase."
  - id: D2
    description: "Nav bar and footer render with structurally identical markup on both / and a non-existent route (404 page)"
    requirement: "SETUP-03"
    verification:
      - kind: other
        ref: "npm run build && grep -c 'id=\"site-nav\"' dist/index.html && grep -c 'id=\"site-nav\"' dist/404.html (both =1); both share the same Layout.astro import"
        status: pass
    human_judgment: false
  - id: D3
    description: "Visiting a non-existent route serves a real 'Page not found' 404 page, not a framework default error"
    requirement: "SETUP-03"
    verification:
      - kind: other
        ref: "npm run build && grep -c 'Page not found' dist/404.html (=1) && test grep -c 'Page not found' dist/index.html = 0; npm run dev + curl http://localhost:4321/does-not-exist confirmed 'Page not found' served"
        status: pass
    human_judgment: false
  - id: D4
    description: "At viewport widths below 768px, the nav collapses links behind an accessible hamburger toggle with a correct open/close accessible label, keyboard-operable via Enter/Space, with visible focus rings on the Contact CTA and the toggle"
    requirement: "SETUP-03"
    verification:
      - kind: other
        ref: "grep -c 'peer-checked' / 'lucide:menu' / 'lucide:x' / 'nav-toggle-open' / 'nav-toggle-close' / 'role=\"button\"' in src/components/Nav.astro all present per plan's automated verify"
        status: pass
      - kind: manual_procedural
        ref: "Resizing viewport below 768px to see the hamburger swap, tabbing to see focus rings, and pressing Enter/Space on the focused toggle all require a human interacting with a real browser"
        status: unknown
    human_judgment: true
    rationale: "Markup, ARIA structure, and keydown-handler code are verified present via grep/code review, but confirming the interaction actually works end-to-end (visible focus ring rendering, CSS peer-checked swap firing on real click/keypress) requires a human driving a browser. Deferred to end-of-phase per config.json human_verify_mode: end-of-phase."

# Metrics
duration: 5min
completed: 2026-07-17
status: complete
---

# Phase 1 Plan 2: Nav/Footer Shell, Badge Primitive, Layout Wiring Summary

**Site-wide nav/footer shell wired through a shared Layout.astro (CSS-only keyboard-operable mobile hamburger, scroll-triggered nav background swap) plus real index/404 routes and an unconsumed Badge.astro primitive.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-17T15:46:17Z
- **Completed:** 2026-07-17T15:50:47Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- `Nav.astro`: sticky `#site-nav` header with a scroll-triggered `.is-scrolled` background swap (idle glass-blur to solid Mantle), desktop Projects/Skills links + accent-filled Contact CTA, and a CSS-only mobile hamburger toggle made fully keyboard-operable (tabindex, role="button", Enter/Space keydown handling) with focus-visible rings on every interactive element
- `Footer.astro`: copyright line plus GitHub/email icon-link slots, each preceded by an explicit `TODO(phase-4)` comment so the `href="#"` placeholders can't ship unfixed
- `Badge.astro`: reusable pill primitive (`default`/`progress` variants) built per UI-SPEC even though its first real consumer is Phase 3
- `Layout.astro`: the single import site for `global.css` and both self-hosted font families, wiring `<Nav /><slot /><Footer />` around every page
- `index.astro` and `404.astro` rebuilt on top of `Layout`, verified via `npm run build` to share identical nav/footer markup, with 404 copy present only on the 404 route

## Task Commits

Each task was committed atomically:

1. **Task 1: Build Nav.astro and Footer.astro** - `07a339d` (feat)
2. **Task 2: Build Badge.astro primitive** - `e425610` (feat)
3. **Task 3: Wire Layout.astro and rebuild index.astro / 404.astro** - `71b0b7a` (feat)

**Plan metadata:** (pending — final docs commit created after this SUMMARY)

## Files Created/Modified
- `src/components/Nav.astro` - Sticky nav shell, scroll-triggered background swap, desktop links + CTA, CSS-only keyboard-operable mobile hamburger toggle
- `src/components/Footer.astro` - Copyright text + two TODO(phase-4)-marked GitHub/email icon-link slots
- `src/components/Badge.astro` - Pill primitive with `label`/`variant` props (`default` | `progress`), unconsumed in Phase 1
- `src/layouts/Layout.astro` - Base HTML shell; sole import site for global.css + font CSS; renders `<Nav /><slot /><Footer />`
- `src/pages/index.astro` - Rewritten to use `Layout`, replacing 01-01's scaffold-default markup with empty `#projects`/`#skills`/`#contact` sections
- `src/pages/404.astro` - New 404 page using the same `Layout`, exact UI-SPEC error copy

## Decisions Made
- Kept the scroll-listener and keyboard-toggle logic in one shared inline `<script>` block inside `Nav.astro` rather than adding a second script — preserves the shell's "near-zero JS" budget from UI-SPEC
- Used TypeScript type annotations (`querySelector<HTMLInputElement>`) inside the Astro inline script; Astro's Vite pipeline strips these at build time without needing a separate `.ts` file or client directive
- Deferred the plan's `<human-check>` visual/keyboard confirmation (Catppuccin Mocha rendering, scroll-swap, hamburger interaction, focus rings) to end-of-phase verification, consistent with `config.json`'s `human_verify_mode: end-of-phase` — this plan contains no `type="checkpoint:human-verify"` task, so it executed fully autonomously (Pattern A); automated confirmation (`npm run build` grep checks + a temporary `npm run dev` + `curl` smoke test showing compiled design tokens and the 404 route both served correctly) was performed in place of a blocking checkpoint

## Deviations from Plan

None - plan executed exactly as written. All `<action>` instructions were followed verbatim; all automated `<verify>` grep checks passed on the first attempt.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Every artifact in UI-SPEC.md's Phase 1 Component Inventory now exists: `Layout.astro`, `Nav.astro`, `Footer.astro`, `Badge.astro`, `index.astro`, `404.astro`
- Phase 1's Walking Skeleton is complete: `npm run build` produces a coherent, styled shell with matching nav/footer across all routes
- `#projects`/`#skills`/`#contact` anchor sections exist as empty mount points, ready for Phase 2 (hero/intro), Phase 3 (projects showcase), and Phase 4 (skills/experience/contact) to fill without touching the shell again
- `Badge.astro` is built and ready for Phase 3's project cards (`progress` variant for evolcpp's "in progress" badge)
- Footer's GitHub/email `href="#"` placeholders are explicitly `TODO(phase-4)`-marked, ready for CONT-01 to wire real destinations
- The full visual/keyboard human-check (Catppuccin Mocha color confirmation, scroll-triggered nav swap, mobile hamburger interaction, focus-ring visibility) remains outstanding and should be performed at end-of-phase verification per `human_verify_mode: end-of-phase`

---
*Phase: 01-foundation-shell*
*Completed: 2026-07-17*

## Self-Check: PASSED

All created files verified present on disk (`src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/Badge.astro`, `src/layouts/Layout.astro`, `src/pages/404.astro`, `src/pages/index.astro`); all 4 task/summary commits (`07a339d`, `e425610`, `71b0b7a`, `4518d54`) verified present in git log.
