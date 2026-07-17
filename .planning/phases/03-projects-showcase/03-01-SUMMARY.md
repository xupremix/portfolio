# Phase 03-projects-showcase — Plan 01 Summary

**Status:** Complete  
**Completed:** 2026-07-17  
**Requirements satisfied:** PROJ-01, PROJ-02, PROJ-03, PROJ-04

## What Was Built

### New: `src/components/ProjectCard.astro`
Reusable, prop-driven presentational card component. Accepts `name`, `description`, `tech[]`,
`href`, `status?` (`'in-progress' | 'team'`), and `teamCredit?`. Renders:
- Title + optional `Badge` (progress or default variant) based on status
- Team-credit paragraph (only when `status === 'team'` and `teamCredit` is set)
- Description body text
- Tech-badge row (one `Badge variant="default"` per tech entry)
- Footer link to GitHub (`target="_blank" rel="noopener noreferrer"`, `mt-auto` push-to-bottom)

No hardcoded project content — all data from props.

### New: `src/components/Projects.astro`
Self-contained `<section id="projects">` component. Contains:
- 6 featured project entries in the UI-SPEC-specified order (kindle, evolcpp, signal_image_video,
  ASA Autobots, NLU, DL2026_AFA_CC) as a typed `const projects` array
- 6 secondary pill links (`const moreOnGithub`) for mlgui, ai_robot, uom, rmtarget,
  oxagworldgenerator, oxagaudiotool
- Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Container: `max-w-[72rem]` (explicit arbitrary value — avoids the spacing-token key-name
  collision documented in PROJECT.md Known Gotchas)
- Zero client-side JS

### Modified: `src/pages/index.astro`
Replaced the empty `<section id="projects"></section>` placeholder with `<Projects />`.
`#skills` and `#contact` empty anchor sections remain intact for Phase 4.

## Decisions

- Used `max-w-[72rem]` (not any `max-w-{xs..3xl}` name) for the section container width per the
  spacing-token key-name gotcha from Phase 2.
- `rel="noopener noreferrer"` applied to every `target="_blank"` link (6 card links + 6 pill
  links) per T-03-01 security mitigation.
- ASA Autobots href hardcoded to `https://github.com/ale-bena/asa-autobots`; verified present in
  built `dist/index.html`.
- Deferred human-check (responsive visual rendering at 375/768/1440px, focus rings) to
  end-of-phase verification per `config.json` `human_verify_mode: end-of-phase`.

## Verification

- `npm run build` ✅ (completes in ~475ms, no errors, 2 pages built)
- `dist/index.html` grep checks ✅ (all 6 project names, badge labels, ale-bena URL, More on
  GitHub heading, all 6 secondary repo names present; hero < projects < skills byte order confirmed)
- Task 1/2 grep checks ✅ (all plan-specified class strings, imports, and security attributes present)

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `src/components/ProjectCard.astro` | Created | 47 |
| `src/components/Projects.astro` | Created | 81 |
| `src/pages/index.astro` | Modified | +1 import, replaced empty section |
