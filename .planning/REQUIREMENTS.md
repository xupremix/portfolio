# Requirements: Filippo Lollato — Portfolio Site

**Defined:** 2026-07-17
**Core Value:** A recruiter who lands on the site for 60 seconds understands who Filippo is, sees credible technical depth, and knows how to reach him.

## v1 Requirements

### Setup

- [x] **SETUP-01**: Astro project scaffolded with Tailwind CSS configured
- [x] **SETUP-02**: Global design system defined (color palette, typography, spacing) — visually striking and cohesive across the site
- [ ] **SETUP-03**: Site navigation/layout shell (header/nav, footer) present across all sections

### Hero

- [ ] **HERO-01**: Hero section displays name, current role/positioning ("ML student, University of Trento"), and a one-line tagline
- [ ] **HERO-02**: Hero section makes a strong first impression and directs attention toward projects/contact

### Projects

- [ ] **PROJ-01**: Featured project cards for kindle, evolcpp, signal_image_video, ASA Autobots, NLU, and DL2026_AFA_CC, each with name, description, tech stack, and link
- [ ] **PROJ-02**: evolcpp card is visually marked as in-progress/upcoming, not a finished project
- [ ] **PROJ-03**: ASA Autobots card credits it as a team project (repo owned by teammate ale-bena)
- [ ] **PROJ-04**: Secondary "more on GitHub" list linking to remaining public repos (mlgui, ai_robot, uom, rmtarget, oxagworldgenerator, oxagaudiotool)

### Skills

- [ ] **SKIL-01**: Skills section lists Rust, Python, ML stack (PyTorch/tch/Burn/ONNX/HuggingFace transformers), and ML hosting/deployment

### Experience & CV

- [ ] **CV-01**: Experience/education section covers current ML studies at University of Trento and the university tutoring role
- [ ] **CV-02**: In-page CV/resume section presents bio, skills, and experience directly on the page (no PDF exists yet)

### Contact

- [ ] **CONT-01**: Contact section/footer displays actionable email (lollatofilippo@gmail.com, mailto link) and GitHub link (github.com/xupremix)

### Polish & Deploy

- [ ] **POL-01**: Site is responsive across mobile, tablet, and desktop breakpoints
- [ ] **POL-02**: Site has meta tags/SEO basics (title, description, Open Graph tags) for link sharing
- [ ] **POL-03**: Site builds cleanly as a static site, ready to deploy to a hosting provider (Vercel/Netlify/GitHub Pages — TBD)

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
| SETUP-01 | Phase 1 | Complete |
| SETUP-02 | Phase 1 | Complete |
| SETUP-03 | Phase 1 | Pending |
| HERO-01 | Phase 2 | Pending |
| HERO-02 | Phase 2 | Pending |
| PROJ-01 | Phase 3 | Pending |
| PROJ-02 | Phase 3 | Pending |
| PROJ-03 | Phase 3 | Pending |
| PROJ-04 | Phase 3 | Pending |
| SKIL-01 | Phase 4 | Pending |
| CV-01 | Phase 4 | Pending |
| CV-02 | Phase 4 | Pending |
| CONT-01 | Phase 4 | Pending |
| POL-01 | Phase 5 | Pending |
| POL-02 | Phase 5 | Pending |
| POL-03 | Phase 5 | Pending |

**Coverage:**

- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-17*
*Last updated: 2026-07-17 after roadmap creation (5-phase structure; CONT-01 consolidated into Phase 4, Polish/Deploy renumbered to Phase 5)*
