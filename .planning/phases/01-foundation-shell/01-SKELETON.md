# Walking Skeleton — Filippo Lollato Portfolio Site

**Phase:** 1
**Generated:** 2026-07-17

## Capability Proven End-to-End

A visitor loading any URL on the site — including a non-existent one — is served a fully built,
Tailwind-styled page using the site's Catppuccin Mocha design system, with an identical nav+footer
shell on every page, produced entirely by `npm run build` with zero manual post-processing and zero
placeholder/mock content in the shipped shell.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Astro 7.x, static output (`output: "static"`, the default) | Matches PROJECT.md constraint: static-first, minimal JS. Astro's island model ships zero client JS unless a component opts in. |
| Styling | Tailwind CSS v4 via the official `@tailwindcss/vite` plugin (added by `astro add tailwind`); CSS-first `@theme` token block in `src/styles/global.css` | v4's CSS-first config lets the Color/Spacing/Typography tokens from UI-SPEC.md live as plain CSS custom properties (no `tailwind.config.js`), directly satisfying SETUP-02 ("global design system defined"). Verified during planning: a `@theme` block with custom `--color-*`, `--spacing-*`, `--font-*`, `--text-*` keys compiles into real utility classes (`bg-base`, `p-xs`, `text-display`, etc.) — confirmed via a real `npm run build` + generated-CSS inspection, not assumed from docs. |
| Component model | Hand-built `.astro` components only — no React/Vue/Svelte island, no shadcn | Per UI-SPEC "Design System" decision: no client-side interactivity is planned yet; keeps the JS payload at ~zero. Revisit only if a later phase introduces genuine interactivity that needs a framework. |
| Fonts | Self-hosted via `@fontsource/inter` (weights 400, 600) and `@fontsource/jetbrains-mono` (weight 600) npm packages, imported in `Layout.astro` | No external Google Fonts network request at runtime, per UI-SPEC "fast-loading" constraint. Chosen over Astro's built-in Font API because the Font API's `local()` provider requires already-possessed font binary files (none exist in this repo) and its `google()` provider still depends on an external font source at build time — `@fontsource` ships the woff2 files directly in the npm package, so the build has zero external network dependency. |
| Icons | `astro-icon` + `@iconify-json/lucide`, build-time inlined SVG via `<Icon name="lucide:xxx" />` | Zero runtime JS/network for icons, per UI-SPEC icon library choice. Verified during planning: `astro add astro-icon` fails (fetch error against the third-party integrations catalog in this environment) — the working path is `npm install astro-icon @iconify-json/lucide` plus a manual `integrations: [icon()]` entry in `astro.config.mjs`. |
| Deployment target | Not chosen yet — explicitly out of scope for Phase 1 | ROADMAP.md scopes hosting-provider selection and the live deploy to Phase 5 (Polish & Deploy, POL-03). Phase 1 only needs a working local `npm run build` / `npm run dev`. |
| Directory layout | `src/layouts/` (Layout.astro), `src/components/` (Nav.astro, Footer.astro, Badge.astro), `src/pages/` (index.astro, 404.astro), `src/styles/` (global.css — theme tokens) | Standard Astro convention; keeps shell primitives (layout/nav/footer/badge) separate from page routes so later phases add page content without touching the shell. |

## Stack Touched in Phase 1

- [x] Project scaffold — Astro 7.x via `create-astro`, npm scripts `dev` / `build` / `preview` present and working
- [x] Routing — two real routes: `/` (`src/pages/index.astro`) and the 404 fallback (`src/pages/404.astro`, Astro's file-based convention)
- [ ] Database — **not applicable.** This is a static, hand-authored content site with no persisted or dynamic data (PROJECT.md explicitly excludes a CMS/admin panel). There is no data layer to read from or write to in any phase of this project.
- [x] UI — the nav bar's mobile hamburger toggle (pure CSS `:checked`/`peer` pattern, no JS) and its scroll-triggered transparent→solid background swap (one small inline `<script>` toggling a class on `scroll`) are the interactive elements in Phase 1. There is no API in this project — "wired to the API" from the generic skeleton checklist does not apply to a static site; the equivalent proof point is "wired to real, non-placeholder page state" (scroll position, checkbox state).
- [x] Deployment — documented local full-stack run: `npm run dev` for the dev server, `npm run build && npm run preview` to verify the production build serves correctly. Live hosting deploy is explicitly Phase 5 scope (POL-03).

## Out of Scope (Deferred to Later Slices)

- Hero content — name, role, tagline, CTA copy (Phase 2, HERO-01/HERO-02)
- Project cards and the "more on GitHub" list (Phase 3, PROJ-01..04)
- Skills list, experience/education section, in-page CV content (Phase 4, SKIL-01, CV-01/CV-02)
- Real footer `mailto:`/GitHub hrefs — Phase 1 ships the icon-link slots with `href="#"` and an explicit `TODO(phase-4)` marker per UI-SPEC's Copywriting Contract; Phase 4 (CONT-01) wires the real URLs
- Scroll-spy active-nav-link highlighting — UI-SPEC reserves accent color for an "active/current nav-link indicator" but does not mandate scroll-spy be built in Phase 1, and there is no content to scroll-spy against yet; revisit only if a later phase's UAT flags it as needed
- SEO meta tags, Open Graph tags, responsive breakpoint hardening beyond the nav's built-in `md:` behavior, and the live hosting deploy (Phase 5, POL-01/POL-02/POL-03)
- Any client-side framework/island (React/Vue/Svelte) or shadcn component library — explicit UI-SPEC decision; revisit only if a genuine interactivity need arises later

## Subsequent Slice Plan

- Phase 2 (Hero): content slots into `src/pages/index.astro`'s `<main>`, above the existing `#projects`/`#skills`/`#contact` anchor sections created in Phase 1
- Phase 3 (Projects Showcase): fills the `#projects` section with real project cards; consumes `Badge.astro`'s `progress` variant for the evolcpp "in progress" badge and its `default` variant for tech-stack tags
- Phase 4 (Skills, Experience & Contact): fills the `#skills` and `#contact` sections; replaces the `TODO(phase-4)` footer link placeholders in `Footer.astro` with the real `mailto:lollatofilippo@gmail.com` and `https://github.com/xupremix` hrefs
- Phase 5 (Polish & Deploy): adds responsive polish beyond the nav's existing breakpoint, SEO/Open Graph `<meta>` tags to `Layout.astro`'s `<head>`, and deploys the built site to a chosen host
