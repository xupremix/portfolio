#!/usr/bin/env node
// Compiles the kindle demo scenarios against the REAL kindle crate and stores
// the verbatim rustc output in src/generated/kindle-outputs.json.
//
//   npm run capture:kindle
//   KINDLE_PATH=/path/to/kindle npm run capture:kindle
//
// Default KINDLE_PATH is ~/kindle — the dev/refactor checkout (typenum shapes,
// backend-agnostic, stable toolchain). The old ~/Projects/kindle checkout is
// the pre-refactor crate and is NOT what the demo should show.
//
// The site never fabricates compiler output: until this script has run, the
// kindle demo shows a "not captured yet" notice for the real-API scenarios.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kindlePath = path.resolve(process.env.KINDLE_PATH ?? path.join(os.homedir(), 'kindle'));
const scenarioDir = path.join(repoRoot, 'src', 'demo-code', 'kindle');
const outFile = path.join(repoRoot, 'src', 'generated', 'kindle-outputs.json');

// Scenario 03 is expected to compile; the others are expected to fail.
const SCENARIOS = ['01-shape-mismatch', '02-dtype-mismatch', '03-shape-spectrum'];

if (!fs.existsSync(path.join(kindlePath, 'Cargo.toml'))) {
  console.error(`kindle repo not found at ${kindlePath} — set KINDLE_PATH.`);
  process.exit(1);
}

// The kindle package may live at the workspace root or in crates/kindle.
const kindleCrate = fs.existsSync(path.join(kindlePath, 'crates', 'kindle', 'Cargo.toml'))
  ? path.join(kindlePath, 'crates', 'kindle')
  : kindlePath;

// One scratch project in a PERSISTENT cache dir so re-runs are fast.
const work = path.join(os.homedir(), '.cache', 'kindle-demo-capture');
fs.rmSync(path.join(work, 'Cargo.lock'), { force: true });
fs.mkdirSync(path.join(work, 'src'), { recursive: true });

// Pre-refactor kindle depends on tch (libtorch). If — and only if — the target
// repo's lockfile mentions tch, add it as a direct dep with download-libtorch
// so torch-sys fetches the exact libtorch it needs (cargo feature unification).
const kindleLockPath = path.join(kindlePath, 'Cargo.lock');
const kindleLockText = fs.existsSync(kindleLockPath) ? fs.readFileSync(kindleLockPath, 'utf8') : '';
const needsTch = /name = "tch"/.test(kindleLockText);

fs.writeFileSync(
  path.join(work, 'Cargo.toml'),
  `[package]
name = "kindle-demo-capture"
version = "0.0.0"
edition = "2021"

[dependencies]
kindle = { path = "${kindleCrate}" }
${needsTch ? 'tch = { version = "0.19.0", features = ["download-libtorch"] }\n' : ''}`,
);

// Mirror the repo's toolchain (stable for dev/refactor, nightly pre-refactor).
const toolchainFile = path.join(kindlePath, 'rust-toolchain.toml');
if (fs.existsSync(toolchainFile)) {
  fs.copyFileSync(toolchainFile, path.join(work, 'rust-toolchain.toml'));
} else {
  fs.rmSync(path.join(work, 'rust-toolchain.toml'), { force: true });
}

// Seed the scratch lockfile from kindle's own Cargo.lock so dependency
// resolution matches the versions kindle actually builds against (a fresh
// resolve can pick e.g. two safetensors versions and break kindle-core).
if (kindleLockText) {
  fs.writeFileSync(path.join(work, 'Cargo.lock'), kindleLockText);
}

function run(cmd, args) {
  try {
    const stdout = execFileSync(cmd, args, { cwd: work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

// Drop cargo housekeeping lines; keep rustc diagnostics verbatim.
function cleanOutput(text) {
  return text
    .split('\n')
    .filter(
      (l) =>
        !/^\s*(Compiling|Finished|Running|Checking|Downloading|Downloaded|Updating|Locking|Adding|warning: unused manifest key)/.test(l) &&
        !/^error: could not compile/.test(l), // cargo housekeeping, not rustc
    )
    .join('\n')
    .replaceAll(work + path.sep, '')
    .replaceAll(kindlePath, '~/kindle') // don't leak absolute local paths
    .trimEnd();
}

const capturedWith = run('rustc', ['--version']).stdout.trim();
console.log(`Capturing with ${capturedWith} against ${kindlePath}`);

const outputs = {};
for (const name of SCENARIOS) {
  const code = fs.readFileSync(path.join(scenarioDir, `${name}.rs`), 'utf8');
  fs.writeFileSync(path.join(work, 'src', 'main.rs'), code);
  // `cargo run` so the correct scenario also captures its real stdout.
  const res = run('cargo', ['run', '--quiet']);
  const success = res.code === 0;
  const output = cleanOutput(success ? res.stdout || '(no output)' : res.stderr);
  outputs[name] = { success, output };
  console.log(`  ${name}: ${success ? 'compiled + ran' : 'compile error captured'}`);
}

const existing = JSON.parse(fs.readFileSync(outFile, 'utf8'));
existing.capturedWith = capturedWith;
existing.capturedAt = new Date().toISOString().slice(0, 10);
existing.outputs = outputs;
fs.writeFileSync(outFile, JSON.stringify(existing, null, 2) + '\n');
console.log(`Wrote ${path.relative(repoRoot, outFile)} — commit this file.`);
console.log(`(build cache kept at ${work} for fast re-runs)`);
