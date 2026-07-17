# Roadmap: Filippo Lollato — Portfolio Site

## Overview

Build a static, single-page portfolio site (Astro + Tailwind) in five additive phases. Each
phase leaves the site in a deployable, viewable state: first the visual foundation and shell,
then the hero first-impression, then the projects showcase (the credibility core), then the
skills/experience/CV/contact content, and finally responsive/SEO/deploy polish. By the end, a
recruiter landing on the live URL gets everything the Core Value promises in under 60 seconds.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Shell** - Astro+Tailwind project scaffolded with a cohesive design system and a site-wide nav/footer shell (completed 2026-07-17, verified 2026-07-17)
- [ ] **Phase 2: Hero** - First-impression hero section with name, role, tagline, and a CTA toward projects/contact
- [ ] **Phase 3: Projects Showcase** - Featured project cards (with correct in-progress/team framing) plus a secondary "more on GitHub" list
- [ ] **Phase 4: Skills, Experience & Contact** - Skills, education/tutoring experience, in-page CV, and actionable contact info
- [ ] **Phase 5: Polish & Deploy** - Responsive breakpoints, SEO/meta tags, and a clean static build ready to deploy

## Phase Details

### Phase 1: Foundation & Shell

**Goal**: The site has a working Astro+Tailwind foundation with a cohesive visual design system and a consistent navigation/footer shell, ready to host all page sections.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03
**Success Criteria** (what must be TRUE):

  1. The Astro project builds successfully (`astro build` / `npm run build`) with Tailwind CSS producing styled output, not default browser styling.
  2. A defined color palette, typography scale, and spacing system are visibly and consistently applied across the page shell.
  3. A header/nav and footer are present and identical in structure across the site (even before content sections are added).
  4. Visiting the site in a browser shows a coherent, styled page shell rather than unstyled HTML.

**Plans**: 2/2 plans complete
Plans:

- [x] 01-01-PLAN.md — Scaffold Astro + Tailwind v4 + fonts/icons; encode UI-SPEC design tokens as a Tailwind @theme block
- [x] 01-02-PLAN.md — Build Nav/Footer/Badge shell, wire Layout.astro, ship real index.astro + 404.astro

**UI hint**: yes

### Phase 2: Hero

**Goal**: A recruiter landing on the site immediately sees who Filippo is, his current role, and a compelling first impression that points them toward projects or contact.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: HERO-01, HERO-02
**Success Criteria** (what must be TRUE):

  1. The hero section displays Filippo's name, current role/positioning ("ML student, University of Trento"), and a one-line tagline.
  2. The hero section is the first thing visible on page load and uses the design system (typography/color) to make a strong visual impression, not plain unstyled text.
  3. The hero includes a clear visual cue (CTA, link, or scroll indicator) directing attention toward the projects or contact section.
  4. The hero section renders correctly and legibly at 375px (mobile), 768px (tablet), and 1440px (desktop) widths.

**Plans**: TBD
**UI hint**: yes

### Phase 3: Projects Showcase

**Goal**: A recruiter can browse Filippo's real technical work — six featured projects with credible depth and correct framing, plus a path to the rest of his GitHub.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04
**Success Criteria** (what must be TRUE):

  1. The site renders 6 featured project cards (kindle, evolcpp, signal_image_video, ASA Autobots, NLU, DL2026_AFA_CC), each showing name, description, tech stack, and a link.
  2. The evolcpp card is visually marked as "in progress"/"upcoming" (e.g., a badge or label), visually distinct from the finished project cards.
  3. The ASA Autobots card credits it as a team project and links to the teammate-owned repo (github.com/ale-bena/asa-autobots).
  4. A secondary "more on GitHub" list is visible, linking to mlgui, ai_robot, uom, rmtarget, oxagworldgenerator, and oxagaudiotool.
  5. Project cards render responsively at mobile/tablet/desktop widths without overlap or overflow.

**Plans**: TBD
**UI hint**: yes

### Phase 4: Skills, Experience & Contact

**Goal**: A recruiter can see Filippo's technical skill set and educational/professional background, and knows exactly how to reach him.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: SKIL-01, CV-01, CV-02, CONT-01
**Success Criteria** (what must be TRUE):

  1. A skills section lists Rust, Python, the ML stack (PyTorch/tch/Burn/ONNX/HuggingFace transformers), and ML hosting/deployment.
  2. An experience/education section shows current ML studies at the University of Trento and the university tutoring role.
  3. An in-page CV/resume section presents bio, skills, and experience directly as page content (no PDF link present).
  4. A contact section/footer displays a clickable mailto link (lollatofilippo@gmail.com) and a GitHub link (github.com/xupremix).

**Plans**: TBD
**UI hint**: yes

### Phase 5: Polish & Deploy

**Goal**: The site is production-ready — responsive across breakpoints, discoverable/shareable via SEO metadata, and builds cleanly for deployment.
**Mode:** mvp
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: POL-01, POL-02, POL-03
**Success Criteria** (what must be TRUE):

  1. All sections render correctly, without layout breakage or overflow, at 375px (mobile), 768px (tablet), and 1440px (desktop) widths.
  2. The page `<head>` includes a title, meta description, and Open Graph tags that produce a correct link preview when the URL is shared.
  3. The static build (`npm run build`) completes cleanly with no errors, producing deployable output.
  4. The built site is deployed (or deploy-ready) to a hosting provider (Vercel/Netlify/GitHub Pages) and reachable via a live URL.

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Shell | 2/2 | Verified   | 2026-07-17 |
| 2. Hero | 0/TBD | Not started | - |
| 3. Projects Showcase | 0/TBD | Not started | - |
| 4. Skills, Experience & Contact | 0/TBD | Not started | - |
| 5. Polish & Deploy | 0/TBD | Not started | - |
