#!/usr/bin/env node
// Compiles the kindle demo scenarios against the REAL kindle crate and stores
// the verbatim rustc output in src/generated/kindle-outputs.json.
//
// Run this on a machine where the kindle repo builds (nightly toolchain,
// libssl-dev installed), then commit the updated JSON:
//
//   node scripts/capture-kindle-outputs.mjs
//   KINDLE_PATH=/path/to/kindle node scripts/capture-kindle-outputs.mjs
//
// The site never fabricates compiler output: until this script has run, the
// kindle demo shows a "not captured yet" notice for the real-API scenarios.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kindlePath = path.resolve(process.env.KINDLE_PATH ?? path.join(os.homedir(), 'Projects', 'kindle'));
const scenarioDir = path.join(repoRoot, 'src', 'demo-code', 'kindle');
const outFile = path.join(repoRoot, 'src', 'generated', 'kindle-outputs.json');

// Scenario 03 is expected to compile; the others are expected to fail.
const SCENARIOS = ['01-chain-mismatch', '02-input-shape', '03-correct'];

if (!fs.existsSync(path.join(kindlePath, 'Cargo.toml'))) {
  console.error(`kindle repo not found at ${kindlePath} — set KINDLE_PATH.`);
  process.exit(1);
}

// One scratch project in a PERSISTENT cache dir: the first run downloads
// libtorch (via tch's download-libtorch feature) and compiles the full dep
// tree; later runs reuse everything and finish in seconds.
const work = path.join(os.homedir(), '.cache', 'kindle-demo-capture');
fs.mkdirSync(path.join(work, 'src'), { recursive: true });
fs.writeFileSync(
  path.join(work, 'Cargo.toml'),
  `[package]
name = "kindle-demo-capture"
version = "0.0.0"
edition = "2021"

[dependencies]
kindle = { path = "${kindlePath}" }
# Direct dep only to enable the feature (cargo feature unification):
# torch-sys then downloads the exact libtorch version tch expects.
tch = { version = "0.19.0", features = ["download-libtorch"] }
`,
);
fs.writeFileSync(path.join(work, 'rust-toolchain.toml'), '[toolchain]\nchannel = "nightly"\n');

// Seed the scratch lockfile from kindle's own Cargo.lock so dependency
// resolution matches the versions kindle actually builds against (a fresh
// resolve can pick e.g. two safetensors versions and break kindle-core).
const kindleLock = path.join(kindlePath, 'Cargo.lock');
if (fs.existsSync(kindleLock)) {
  fs.copyFileSync(kindleLock, path.join(work, 'Cargo.lock'));
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
    .filter((l) => !/^\s*(Compiling|Finished|Running|Checking|Downloading|Downloaded|Updating|Locking|Adding|warning: unused manifest key)/.test(l))
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
