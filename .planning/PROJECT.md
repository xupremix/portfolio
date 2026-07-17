# Filippo Lollato — Portfolio Site

## What This Is

A personal portfolio website for Filippo Lollato, an ML student at the University of Trento, built to be shared with recruiters and hiring managers. It showcases his real projects (systems ML/robotics/NLP work in Rust and Python), skills, experience, and contact info in a visually striking, fast, easy-to-navigate static site.

## Core Value

A recruiter who lands on the site for 60 seconds understands who Filippo is, sees credible technical depth (real projects, not filler), and knows how to reach him. If that doesn't land, nothing else matters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Hero/intro section — name, current role ("ML student, University of Trento"), one-line positioning, visually striking first impression
- [ ] Projects showcase — cards/sections for the 6 featured projects (kindle, evolcpp, signal_image_video, ASA Autobots, NLU, DL2026_AFA_CC) with description, tech stack, and GitHub links
- [ ] Secondary "more projects" area linking out to other public GitHub repos (mlgui, ai_robot, uom, rmtarget, oxagworldgenerator, oxagaudiotool)
- [ ] Skills section — Rust, Python, ML stack (PyTorch/tch/Burn/ONNX/HuggingFace transformers), ML hosting/deployment
- [ ] Experience/education section — University of Trento ML studies (current), university tutoring
- [ ] In-page CV/resume section (no PDF exists yet — built from bio/skills/experience content directly on the page, not a download link)
- [ ] Contact section — email (lollatofilippo@gmail.com), GitHub (github.com/xupremix)
- [ ] Responsive, fast-loading, visually polished design (Astro + Tailwind)
- [ ] Deployable as a static site (Vercel/Netlify/GitHub Pages — host TBD)

### Out of Scope

- Blog / articles section — not requested, adds scope without recruiter value
- CMS or admin panel — content is static and personally maintained via git
- PDF resume generation/export — no source CV exists yet; revisit once one does
- Analytics/tracking — not requested; can be added later if wanted
- Private-repo project details (signal_image_video, NLU, DL2026_AFA_CC) being publicly browsable on GitHub — link will 404/private for visitors; site describes them in prose instead of relying on the repo being viewable

## Context

- Filippo is currently studying Machine Learning at the University of Trento and also works as a university tutor there.
- GitHub: github.com/xupremix. Several featured project repos are private (signal_image_video, NLU, DL2026_AFA_CC, and evol which is excluded) — the site should describe these projects in enough depth that the description carries the credibility even without public code access.
- **evol** is an older, non-working predecessor of **kindle** — excluded from the showcase entirely.
- **evolcpp** is a planned/in-progress C++ port of kindle — should be presented as upcoming/in-progress, not a finished project.
- **ASA Autobots** (github.com/ale-bena/asa-autobots) is a team project; the repo is owned by teammate ale-bena, not Filippo — credit it as a team project when featured.
- Project research pulled directly from READMEs/reports in the local repos and GitHub API (see conversation) rather than generic domain research, since the content is fully known firsthand.
- The portfolio's own repo is tracked in git locally; the eventual GitHub remote should be created as **private** for now.
- Commits to this repo must not include any AI co-author attribution — plain authorship only.

## Constraints

- **Tech stack**: Astro + Tailwind CSS — static-first for speed and visual polish, minimal JS shipped. Chosen over Next.js (heavier, unneeded interactivity) and plain HTML/CSS/JS (no component reuse for repeated project cards).
- **Content accuracy**: Project descriptions must stay factually accurate to what each repo actually contains — no invented metrics or features.
- **No CV file**: Resume content lives in-page as HTML/CSS, not a PDF — until Filippo produces an actual CV.
- **Repo visibility**: Portfolio's own GitHub remote (once created) must be private for now.
- **Git authorship**: No AI co-author trailers in commits to this repo.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Astro + Tailwind over Next.js/plain HTML | Best fit for a fast, visually rich, mostly-static portfolio; user deferred stack choice with "make it look good" | — Pending |
| Feature 6 projects (kindle, evolcpp, signal_image_video, ASA Autobots, NLU, DL2026_AFA_CC), rest linked as "more on GitHub" | Keeps showcase focused on strongest/most illustrative work rather than diluting with minor repos | — Pending |
| evol excluded from showcase | Older, non-working predecessor of kindle per user | ✓ Good |
| evolcpp shown as "in progress" not "finished" | It's a planned/ongoing port, not complete, per user | ✓ Good |
| In-page CV instead of PDF download | No physical CV exists yet | — Pending |
| Skip domain research phase | Domain (personal portfolio site) is well-understood; real project content already gathered directly from repos | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-17 after initialization*
