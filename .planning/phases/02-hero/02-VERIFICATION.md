---
phase: 02-hero
verified: 2026-07-17T18:30:00Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 2: Hero Verification Report

**Phase Goal:** A recruiter landing on the site immediately sees who Filippo is, his current role, and a compelling first impression that points them toward projects or contact.
**Verified:** 2026-07-17T18:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Phase 2 Success Criteria) | Status | Evidence |
|---|---|---|---|
| 1 | The hero section displays Filippo's name, current role/positioning ("ML student, University of Trento"), and a one-line tagline | ✓ VERIFIED | `src/components/Hero.astro` contains exact strings "Filippo Lollato" (`<h1>`), "ML Student, University of Trento" (eyebrow `<p>`), and "Systems ML, from Rust to robotics — I build things that actually run." (tagline `<p>`). Confirmed present in compiled `dist/index.html` and in live headless-Chromium screenshots at all 3 breakpoints. |
| 2 | The hero section is the first thing visible on page load and uses the design system (typography/color) to make a strong visual impression, not plain unstyled text | ✓ VERIFIED | `dist/index.html` byte-offset check: `id="hero"` (offset 4384) precedes `id="projects"` (offset 6179) — hero renders before any other main content. Root section uses `min-h-[calc(100vh_-_64px)]` to fill the viewport below the fixed nav. Uses design-system typography roles (`text-display`/`text-heading`/`text-label`) and `text-accent`/`bg-accent` color tokens — confirmed via source read and rendered screenshots (large serif-weight name, accent-colored eyebrow tag, filled accent CTA button). |
| 3 | The hero includes a clear visual cue (CTA, link, or scroll indicator) directing attention toward the projects or contact section | ✓ VERIFIED | Three cues present and functional: primary "View Projects" button (`href="#projects"`), secondary "Get in touch" link (`href="#contact"`), and an absolutely-positioned scroll-cue chevron (`id="hero-scroll-cue"`, `href="#projects"`, `aria-label="Scroll to projects"`). Live keyboard-tab test confirms all three are focusable in logical order (6th, 7th, 8th tab stop) with a visible focus ring (`box-shadow` ring, accent color, confirmed via computed style + screenshot). Reduced-motion behavior independently verified at runtime: `getComputedStyle(#hero-scroll-cue).animationName` returns `"hero-bounce"` under normal conditions and `"none"` under emulated `prefers-reduced-motion: reduce` — this is a genuine runtime behavioral check, not a static grep of the CSS source. |
| 4 | The hero section renders correctly and legibly at 375px (mobile), 768px (tablet), and 1440px (desktop) widths | ✓ VERIFIED | Live headless-Chromium screenshots taken at exactly 375px, 768px, and 1440px viewport widths against the production build (`npm run build` + `serve dist`) confirm correct, legible, non-overlapping rendering at all three: content is centered, text wraps naturally within a real ~672px (`max-w-[42rem]`) content column, CTA group stacks appropriately, and the scroll-cue sits correctly at the bottom. This supersedes and confirms the fix documented in commit `78aec22` (`max-w-2xl` → `max-w-[42rem]`), independently re-verified in this session (see Known Gotcha note below). |

**Score:** 4/4 truths verified (0 present-but-behavior-unverified)

### Known Gotcha — Verified Fixed

The executor's original plan/implementation used `max-w-2xl`, which in this project's Tailwind v4 `@theme static` config (custom spacing scale reusing the reserved size-scale key names `xs/sm/md/lg/xl/2xl/3xl`) compiles to `max-width: var(--spacing-2xl)` = **48px**, not Tailwind's classic 672px container width. This collapsed the hero's content column to ~48px wide, wrapping the name/tagline to 1-2 words per line even at 1440px viewport width — a genuine bug that would have failed Success Criterion #4.

This was caught during this verification session's visual check, fixed in commit `78aec22` (`fix(02-hero): use explicit max-w-[42rem] instead of max-w-2xl`), and documented in `PROJECT.md`'s new "Known Gotchas" section to prevent recurrence in later phases (Phase 3/4/5 will use custom spacing tokens too).

**Independent re-verification of the fix in this session (not just trusting the fix commit message):**
- Source check: `src/components/Hero.astro` line 9 now reads `max-w-[42rem]` (not `max-w-2xl`).
- Compiled CSS check: `dist/_astro/Layout.*.css` contains `.max-w-\[42rem\]{max-width:42rem}` — confirms the arbitrary-value class compiles to a real 672px constraint, not the 48px spacing-scale collision.
- Visual check: fresh headless-Chromium screenshots at 375px/768px/1440px (this session, post-fix) show natural text wrapping and correct proportions — not the 1-2-word-per-line collapse the bug would have caused.

Status: **Resolved, not outstanding.**

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/Hero.astro` | Self-contained hero component: eyebrow, `<h1>` name, tagline, CTA group, accessible scroll-cue with reduced-motion-aware animation | ✓ VERIFIED | Exists, substantive (61 lines, all required copy/markup/accessibility attributes present, no stub markers), wired (imported and rendered by `index.astro`), data flows correctly (all content is static hand-authored copy per UI-SPEC, no data-fetch needed for this phase) |
| `src/pages/index.astro` | Renders `<Hero />` as first child of `<main>`, before `#projects`/`#skills`/`#contact` | ✓ VERIFIED | `import Hero from '../components/Hero.astro';` present; `<Hero />` renders before the three existing anchor sections, all three (`#projects`, `#skills`, `#contact`) remain present and unmodified |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/pages/index.astro` | `src/components/Hero.astro` | `import Hero from '../components/Hero.astro'` + `<Hero />` as first child of `<main>` | ✓ WIRED | Confirmed in source and in compiled `dist/index.html` byte-offset ordering |
| `src/components/Hero.astro` | `src/styles/global.css` | Reuses `@theme` tokens (`text-display`/`text-heading`/`text-label`, `text-accent`/`bg-accent`/`text-text`/`text-subtext`, spacing scale) | ✓ WIRED | Zero new tokens introduced; all classes resolve to existing Phase 1 `@theme` definitions, confirmed via compiled CSS inspection |

### Data-Flow Trace (Level 4)

Not applicable — Hero.astro is fully static, hand-authored content per UI-SPEC (no props, no fetch, no dynamic data). No hollow-prop or disconnected-data-source risk exists in this phase.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npm run build` succeeds | `npm run build` | 2 pages built, no errors | ✓ PASS |
| Hero renders before `#projects` in compiled output | `dist/index.html` byte-offset check | hero offset 4384 < projects offset 6179 | ✓ PASS |
| `#skills`/`#contact` anchors remain intact | grep count on `dist/index.html` and `src/pages/index.astro` | 1 occurrence each, unmodified | ✓ PASS |
| Tab order reaches Hero's 3 interactive elements in sequence | live Playwright keyboard-Tab trace against `npm run build` + `serve dist` | View Projects (tab 6) → Get in touch (tab 7) → scroll-cue (tab 8), in DOM order after Nav's 4 focusable items | ✓ PASS |
| Focus-visible ring renders on Hero CTA | Playwright: focus "View Projects", read computed `box-shadow` | Non-transparent 2px ring, accent color at reduced opacity — matches `focus-visible:ring-2 focus-visible:ring-accent/60` | ✓ PASS |
| Scroll-cue animation respects `prefers-reduced-motion` | Playwright: `emulateMedia({ reducedMotion: 'reduce' })`, read computed `animation-name` on `#hero-scroll-cue` | `"hero-bounce"` normally → `"none"` under reduced-motion emulation | ✓ PASS |
| Hero renders correctly at 375px/768px/1440px | Real headless-Chromium screenshots against production build at exact viewport widths | Content centered, legible, no overflow/overlap, natural text wrap at all 3 widths (this session, post-`max-w-[42rem]`-fix) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HERO-01 | 02-01-PLAN.md | Hero section displays name, current role/positioning ("ML student, University of Trento"), and a one-line tagline | ✓ SATISFIED | All three copy elements present in `Hero.astro`, rendered first on page load, confirmed via source + live screenshots |
| HERO-02 | 02-01-PLAN.md | Hero section makes a strong first impression and directs attention toward projects/contact | ✓ SATISFIED | Design-system typography/color used (not plain text); 3 directional cues (CTA button, secondary link, scroll-cue) present, accessible, keyboard-focusable, and functionally wired to `#projects`/`#contact` |

No orphaned requirements — REQUIREMENTS.md maps only HERO-01/HERO-02 to Phase 2, both claimed by `02-01-PLAN.md`'s `requirements` frontmatter.

### Anti-Patterns Found

None. Scanned `src/components/Hero.astro` and `src/pages/index.astro` for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`, "coming soon"/"not yet implemented", empty-return stubs, and hardcoded-empty-data patterns — zero matches. No debt markers present.

### Human Verification Required

None. All items originally deferred to end-of-phase verification per `config.json` `human_verify_mode: end-of-phase` (responsive rendering at 375/768/1440px, focus-ring visibility, reduced-motion behavior, CTA/scroll-cue navigation) were independently confirmed in this session via live headless-Chromium screenshots and Playwright runtime behavioral checks (computed `box-shadow` for focus rings, computed `animation-name` under emulated `prefers-reduced-motion`) — not just static grep assertions or trust in SUMMARY.md claims.

### Gaps Summary

No gaps. All 4 ROADMAP Phase 2 success criteria verified against the current (post-fix) codebase state. The one real bug found during hands-on visual verification (`max-w-2xl` silently resolving to the custom 48px spacing-scale token instead of a real content width) was fixed in commit `78aec22`, independently re-verified in this session via source, compiled-CSS, and live-screenshot checks, and documented in `PROJECT.md`'s Known Gotchas section to prevent recurrence in Phases 3-5.

---

*Verified: 2026-07-17T18:30:00Z*
*Verifier: Claude (gsd-verifier)*
