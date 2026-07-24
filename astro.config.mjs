// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';

function devProjectsPlugin() {
  return {
    name: 'dev-projects-plugin',
    configureServer(server) {
      server.middlewares.use('/_dev/save-project', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const filepath = path.join(process.cwd(), 'src', 'content', 'projects', `${Date.now()}-${slug}.md`);
              
              let md = '---\n';
              for (const [key, value] of Object.entries(data)) {
                if (key === 'description' || key === 'name' || key === 'href' || key === 'anchor' || key === 'impact' || key === 'role' || key === 'demoId' || key === 'status' || key === 'teamCredit') {
                  if (value) md += `${key}: '${value.replace(/'/g, "''")}'\n`;
                } else if (key === 'tech') {
                  const techArray = typeof value === 'string' ? value.split(',').map(s => s.trim()) : value;
                  md += `tech: [${techArray.map(t => `'${t}'`).join(', ')}]\n`;
                } else if (key === 'index' && value) {
                  md += `index: ${value}\n`;
                }
              }
              md += '---\n';
              
              fs.writeFileSync(filepath, md);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        }
      });

      server.middlewares.use('/_dev/save-skills', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const filepath = path.join(process.cwd(), 'src', 'data', 'skills.json');
              fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        }
      });

      server.middlewares.use('/_dev/save-experience', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const filepath = path.join(process.cwd(), 'src', 'data', 'experience.json');
              fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        }
      });
    }
  };
}

// https://astro.build/config
export default defineConfig({
  // Static-first is a hard project constraint: no adapter, no server output.
  site: 'https://filippolollato.dev',
  integrations: [
    icon(), 
    sitemap(),
    {
      name: 'dev-mode-routes',
      hooks: {
        'astro:config:setup': ({ injectRoute, command }) => {
          if (command === 'dev') {
            injectRoute({ pattern: '/dev', entrypoint: 'src/dev-pages/index.astro' });
            injectRoute({ pattern: '/dev/skills', entrypoint: 'src/dev-pages/skills.astro' });
            injectRoute({ pattern: '/dev/experience', entrypoint: 'src/dev-pages/experience.astro' });
          }
        }
      }
    }
  ],
  vite: {
    plugins: [tailwindcss(), devProjectsPlugin()]
  }
});
