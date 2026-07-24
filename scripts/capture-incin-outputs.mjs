#!/usr/bin/env node
// Compiles the incin demo scenarios against the REAL incin crate and stores
// the verbatim rustc output in src/generated/incin-outputs.json.
//
//   npm run capture:incin
//   INCIN_PATH=/path/to/incin npm run capture:incin
//
// Default INCIN_PATH is ~/Projects/incin.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const incinPath = path.resolve(process.env.INCIN_PATH ?? path.join(os.homedir(), 'Projects', 'incin'));
const scenarioDir = path.join(repoRoot, 'src', 'demo-code', 'incin');
const outFile = path.join(repoRoot, 'src', 'generated', 'incin-outputs.json');

// Scenario 03 is expected to compile; the others are expected to fail.
const SCENARIOS = ['01-shape-mismatch', '02-dtype-mismatch', '03-shape-spectrum'];

if (!fs.existsSync(path.join(incinPath, 'Cargo.toml'))) {
  console.error(`incin repo not found at ${incinPath} — set INCIN_PATH.`);
  process.exit(1);
}

// The incin package may live at the workspace root or in crates/incin.
const incinCrate = fs.existsSync(path.join(incinPath, 'crates', 'incin', 'Cargo.toml'))
  ? path.join(incinPath, 'crates', 'incin')
  : incinPath;

// One scratch project in a PERSISTENT cache dir so re-runs are fast.
const work = path.join(os.homedir(), '.cache', 'incin-demo-capture');
fs.rmSync(path.join(work, 'Cargo.lock'), { force: true });
fs.mkdirSync(path.join(work, 'src'), { recursive: true });

const incinLockPath = path.join(incinPath, 'Cargo.lock');
const incinLockText = fs.existsSync(incinLockPath) ? fs.readFileSync(incinLockPath, 'utf8') : '';

fs.writeFileSync(
  path.join(work, 'Cargo.toml'),
  `[package]
name = "incin-demo-capture"
version = "0.0.0"
edition = "2021"

[dependencies]
incin = { path = "${incinCrate}" }`,
);

const toolchainFile = path.join(incinPath, 'rust-toolchain.toml');
if (fs.existsSync(toolchainFile)) {
  fs.copyFileSync(toolchainFile, path.join(work, 'rust-toolchain.toml'));
} else {
  fs.rmSync(path.join(work, 'rust-toolchain.toml'), { force: true });
}

if (incinLockText) {
  fs.writeFileSync(path.join(work, 'Cargo.lock'), incinLockText);
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
        !/^error: could not compile/.test(l),
    )
    .join('\n')
    .replaceAll(work + path.sep, '')
    .replaceAll(incinPath, '~/incin')
    .trimEnd();
}

const capturedWith = run('rustc', ['--version']).stdout.trim();
console.log(`Capturing with ${capturedWith} against ${incinPath}`);

const outputs = {};
for (const name of SCENARIOS) {
  const code = fs.readFileSync(path.join(scenarioDir, `${name}.rs`), 'utf8');
  fs.writeFileSync(path.join(work, 'src', 'main.rs'), code);
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
