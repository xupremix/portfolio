// Screenshots the paper design mode (hero, projects, one dialog).
import { chromium } from 'playwright-core';
import os from 'node:os';
import path from 'node:path';
const port = process.argv[2];
const out = process.env.SHOT_DIR ?? '.';
const exe = path.join(os.homedir(), '.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell');
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.click('[data-mode-toggle]');
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(out, 'paper-hero.png') });
await page.evaluate(() => document.getElementById('projects').scrollIntoView({ behavior: 'instant' }));
await page.waitForTimeout(1100);
await page.screenshot({ path: path.join(out, 'paper-projects.png') });
await page.evaluate(() => document.getElementById('experience').scrollIntoView({ behavior: 'instant' }));
await page.waitForTimeout(1100);
await page.screenshot({ path: path.join(out, 'paper-experience.png') });
await page.evaluate(() => {
  const btn = document.querySelector('[data-demo-id="asa-demo"]');
  btn.scrollIntoView({ behavior: 'instant', block: 'center' });
  btn.click();
});
await page.waitForTimeout(2200);
await page.screenshot({ path: path.join(out, 'paper-asa.png') });
// reload → mode must persist
await page.evaluate(() => document.querySelector('dialog[open]')?.close());
await page.reload({ waitUntil: 'networkidle' });
const persisted = await page.evaluate(() => document.documentElement.dataset.mode);
console.log('persisted mode after reload:', persisted);
console.log(errors.length ? 'JS ERRORS:\n' + errors.join('\n') : 'no JS errors');
await browser.close();
