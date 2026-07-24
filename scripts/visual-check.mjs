// Drives the site in the ms-playwright headless shell: section + dialog +
// mobile screenshots for design review. Usage: node visual-check.mjs <port>
import { chromium } from 'playwright-core';
import os from 'node:os';
import path from 'node:path';

const port = process.argv[2];
const outDir = process.env.SHOT_DIR ?? ".";
const exe = path.join(
  os.homedir(),
  '.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
);

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1250 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));

await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });

for (const id of ['projects', 'skills', 'experience', 'contact']) {
  await page.evaluate((id) => document.getElementById(id).scrollIntoView({ behavior: 'instant' }), id);
  await page.waitForTimeout(1100); // let reveals finish
  await page.screenshot({ path: path.join(outDir, `sec-${id}.png`) });
}

// Open each demo dialog and screenshot it
for (const demo of ['incin-demo', 'asa-demo', 'signal-demo', 'nlu-demo']) {
  await page.evaluate((demo) => {
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    const btn = document.querySelector(`[data-demo-id="${demo}"]`);
    btn.scrollIntoView({ behavior: 'instant', block: 'center' });
    btn.click();
  }, demo);
  await page.waitForTimeout(demo === 'incin-demo' ? 3500 : 2200); // editor lazy-load / anims
  await page.screenshot({ path: path.join(outDir, `demo-${demo}.png`) });
}

// Mobile pass: hero + projects + one dialog
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
mob.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
await mob.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await mob.screenshot({ path: path.join(outDir, 'mob-hero.png') });
await mob.evaluate(() => document.getElementById('projects').scrollIntoView({ behavior: 'instant' }));
await mob.waitForTimeout(1100);
await mob.screenshot({ path: path.join(outDir, 'mob-projects.png') });
await mob.evaluate(() => {
  const btn = document.querySelector('[data-demo-id="asa-demo"]');
  btn.scrollIntoView({ behavior: 'instant', block: 'center' });
  btn.click();
});
await mob.waitForTimeout(2200);
await mob.screenshot({ path: path.join(outDir, 'mob-asa.png') });

console.log(errors.length ? 'JS ERRORS:\n' + errors.join('\n') : 'no JS errors');
await browser.close();
