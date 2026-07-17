---
phase: 02-hero
plan: 01
subsystem: ui
tags: [astro, tailwind, hero, accessibility]

# Dependency graph
requires:
  - phase: 01-foundation-shell
    provides: Design tokens (@theme in global.css), Nav.astro focus-ring/CTA patterns, astro-icon/lucide setup
provides:
  - "Hero.astro: self-contained hero section with eyebrow, name, tagline, CTA group, and accessible scroll-cue"
  - "index.astro mounts Hero as the first child of main, before #projects/#skills/#contact"
affects: [03-projects, 04-skills-experience-contact, 05-polish-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hero-specific viewport-fill rule: min-h-[calc(100vh_-_64px)] (100vh minus fixed 64px nav height)"
    - "CSS-only scroll-cue bounce via scoped @keyframes, disabled under @media (prefers-reduced-motion: reduce)"

key-files:
  created: [src/components/Hero.astro]
  modified: [src/pages/index.astro]

key-decisions:
  - "No deviations from plan; implemented exactly as specified in 02-01-PLAN.md"
  - "Human-check (responsive/focus-ring/reduced-motion visual verification) deferred to end-of-phase verification per config.json human_verify_mode: end-of-phase, consistent with Phase 1's convention"

patterns-established:
  - "Hero sections reserve full viewport below the fixed nav using calc(100vh - <nav-height>) with underscore-escaped arbitrary Tailwind value syntax"

requirements-completed: [HERO-01, HERO-02]

coverage:
  - id: D1
    description: "Hero section displays name, role/positioning, and tagline as first visible content on load"
    requirement: "HERO-01"
    verification:
      - kind: automated_ui
        ref: "grep assertions on src/components/Hero.astro (id=hero, exact copy strings) + dist/index.html byte-offset ordering (hero before #projects)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Hero uses design system typography/color tokens (Display/Heading/Label, accent) rather than plain unstyled text"
    requirement: "HERO-01"
    verification:
      - kind: automated_ui
        ref: "grep assertions on src/components/Hero.astro (text-display, text-heading, text-label, text-accent classes) + npm run build"
        status: pass
    human_judgment: false
  - id: D3
    description: "CTA button, secondary link, and scroll-cue chevron direct attention toward #projects/#contact"
    requirement: "HERO-02"
    verification:
      - kind: automated_ui
        ref: "grep assertions on src/components/Hero.astro (View Projects/Get in touch copy, href targets, focus-visible:ring-2 count >= 3)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Hero renders correctly and legibly at 375px, 768px, and 1440px widths without overflow or overlap"
    verification: []
    human_judgment: true
    rationale: "Responsive visual rendering requires a real browser viewport check; deferred to end-of-phase human-check per config.json human_verify_mode: end-of-phase"
  - id: D5
    description: "Scroll-cue bounce animation respects prefers-reduced-motion; focus rings visible on tab through CTA/link/scroll-cue"
    verification:
      - kind: unit
        ref: "grep 'prefers-reduced-motion' src/components/Hero.astro (static assertion the media query rule exists)"
        status: pass
    human_judgment: true
    rationale: "Static assertion confirms the CSS rule exists, but actual reduced-motion behavior and visible focus-ring rendering require interactive browser verification, deferred to end-of-phase human-check"

# Metrics
duration: 5min
completed: 2026-07-17
status: complete
---

# Phase 2 Plan 1: Hero Summary

**Self-contained Hero.astro (eyebrow/name/tagline/CTA/scroll-cue) mounted as the first section on the homepage, filling the viewport below the fixed nav via `min-h-[calc(100vh_-_64px)]`**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-17T18:15:00Z (approx)
- **Completed:** 2026-07-17T18:20:00Z (approx)
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Built `Hero.astro`: eyebrow role tag ("ML Student, University of Trento"), `<h1>` name ("Filippo Lollato"), tagline, primary "View Projects" CTA button, secondary "Get in touch" link, and an absolutely-positioned scroll-cue chevron with `aria-label="Scroll to projects"`
- Scroll-cue bounce animation implemented as CSS-only `@keyframes`, disabled under `@media (prefers-reduced-motion: reduce)`
- Mounted `<Hero />` as the first child of `<main>` in `index.astro`, immediately before the existing `#projects` section, with `#projects`/`#skills`/`#contact` anchors left completely intact
- Zero new design tokens introduced — reused all typography/color/spacing tokens from Phase 1's `global.css` and `Nav.astro`'s CTA/focus-ring/link patterns
- `npm run build` succeeds; `dist/index.html` confirms hero renders before `#projects` and `#skills`/`#contact` remain present

## Task Commits

Each task was committed atomically:

1. **Task 1: Build Hero.astro** - `3b8d1f6` (feat)
2. **Task 2: Mount Hero on the homepage** - `9e897b6` (feat)

**Plan metadata:** (this commit, following SUMMARY/STATE/ROADMAP update)

## Files Created/Modified
- `src/components/Hero.astro` - New self-contained hero component (eyebrow, name, tagline, CTA group, scroll-cue with reduced-motion-aware bounce)
- `src/pages/index.astro` - Imports `Hero` and renders `<Hero />` as the first child of `<main>`, before `#projects`

## Decisions Made
None - followed plan as specified. No new tokens, no new dependencies, no client-side script added.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2's entire scope (hero section) is complete: `npm run build` passes, hero renders before `#projects`/`#skills`/`#contact`, and all automated verification from the plan passed
- Deferred to end-of-phase verification (per `config.json` `human_verify_mode: end-of-phase`): visual/responsive check at 375px/768px/1440px, tab-order focus-ring visibility, and browser-level `prefers-reduced-motion` behavior — flagged as `human_judgment: true` coverage items (D4, D5) above for the verifier to pick up
- Phase 3 (Projects) can proceed independently; no blockers introduced by this plan

---
*Phase: 02-hero*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: src/components/Hero.astro
- FOUND: src/pages/index.astro
- FOUND: 3b8d1f6 (Task 1 commit)
- FOUND: 9e897b6 (Task 2 commit)
