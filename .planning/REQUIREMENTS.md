# Requirements: Filippo Lollato — Portfolio Site

**Defined:** 2026-07-17
**Core Value:** A recruiter who lands on the site for 60 seconds understands who Filippo is, sees credible technical depth, and knows how to reach him.

## v1 Requirements

### Setup

- [x] **SETUP-01**: Astro project scaffolded with Tailwind CSS configured
- [x] **SETUP-02**: Global design system defined (color palette, typography, spacing) — visually striking and cohesive across the site
- [x] **SETUP-03**: Site navigation/layout shell (header/nav, footer) present across all sections

### Hero

- [x] **HERO-01**: Hero section displays name, current role/positioning ("ML student, University of Trento"), and a one-line tagline
- [x] **HERO-02**: Hero section makes a strong first impression and directs attention toward projects/contact

### Projects

- [x] **PROJ-01**: Featured project cards for kindle, evolcpp, signal_image_video, ASA Autobots, NLU, and DL2026_AFA_CC, each with name, description, tech stack, and link
- [x] **PROJ-02**: evolcpp card is visually marked as in-progress/upcoming, not a finished project
- [x] **PROJ-03**: ASA Autobots card credits it as a team project (repo owned by teammate ale-bena)
- [x] **PROJ-04**: Secondary "more on GitHub" list linking to remaining public repos (mlgui, ai_robot, uom, rmtarget, oxagworldgenerator, oxagaudiotool)

### Skills

- [x] **SKIL-01**: Skills section lists Rust, Python, ML stack (PyTorch/tch/Burn/ONNX/HuggingFace transformers), and ML hosting/deployment

### Experience & CV

- [x] **CV-01**: Experience/education section covers current ML studies at University of Trento and the university tutoring role
- [x] **CV-02**: In-page CV/resume section presents bio, skills, and experience directly on the page (no PDF exists yet)

### Contact

- [x] **CONT-01**: Contact section/footer displays actionable email (lollatofilippo@gmail.com, mailto link) and GitHub link (github.com/xupremix)

### Polish & Deploy

- [x] **POL-01**: Site is responsive across mobile, tablet, and desktop breakpoints
- [x] **POL-02**: Site has meta tags/SEO basics (title, description, Open Graph tags) for link sharing
- [x] **POL-03**: Site builds cleanly as a static site, ready to deploy to a hosting provider (Vercel/Netlify/GitHub Pages — TBD)

## v2 Requirements

Deferred — not in current roadmap.

### Content Expansion

- **V2-01**: PDF resume download once a physical CV exists
- **V2-02**: Blog/articles section
- **V2-03**: Analytics/visitor tracking

## Out of Scope

| Feature | Reason |
|---------|--------|
| CMS / admin panel | Content is static, personally maintained via git |
| PDF resume generation | No source CV exists yet |
| Public browsability of private project repos | signal_image_video, NLU, DL2026_AFA_CC are private on GitHub — site describes them in prose instead |
| evol (deprecated kindle predecessor) in showcase | Older, non-working version superseded by kindle |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Verified |
| SETUP-02 | Phase 1 | Verified |
| SETUP-03 | Phase 1 | Verified |
| HERO-01 | Phase 2 | Verified |
| HERO-02 | Phase 2 | Verified |
| PROJ-01 | Phase 3 | Verified |
| PROJ-02 | Phase 3 | Verified |
| PROJ-03 | Phase 3 | Verified |
| PROJ-04 | Phase 3 | Verified |
| SKIL-01 | Phase 4 | Verified |
| CV-01 | Phase 4 | Verified |
| CV-02 | Phase 4 | Verified |
| CONT-01 | Phase 4 | Verified |
| POL-01 | Phase 5 | Verified |
| POL-02 | Phase 5 | Verified |
| POL-03 | Phase 5 | Verified |

**Coverage:**

- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-17*
*Last updated: 2026-07-17 after roadmap creation (5-phase structure; CONT-01 consolidated into Phase 4, Polish/Deploy renumbered to Phase 5)*
