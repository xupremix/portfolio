// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Static-first is a hard project constraint: no adapter, no server output.
  site: 'https://filippolollato.dev',
  integrations: [icon(), sitemap()],
  vite: {
    plugins: [tailwindcss()]
  }
});
