import type { APIRoute } from 'astro';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code } = await request.json();

    if (!code) {
      return new Response(JSON.stringify({ success: false, stderr: 'No code provided' }), { status: 400 });
    }

    // Create a temporary directory for the cargo project
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kindle-demo-'));
    
    // Write Cargo.toml
    const cargoToml = `
[package]
name = "kindle-demo-run"
version = "0.1.0"
edition = "2021"

[dependencies]
kindle = { path = "/home/xupremix/Projects/kindle" }
    `;
    await fs.writeFile(path.join(tempDir, 'Cargo.toml'), cargoToml);

    // Write src/main.rs
    await fs.mkdir(path.join(tempDir, 'src'));
    await fs.writeFile(path.join(tempDir, 'src', 'main.rs'), code);

    // Run cargo check instead of build for speed
    let stdout = '';
    let stderr = '';
    let success = false;

    try {
      const result = await execAsync('cargo check --offline', { cwd: tempDir, timeout: 15000 });
      stdout = result.stdout;
      stderr = result.stderr;
      success = true;
    } catch (error: any) {
      stdout = error.stdout || '';
      stderr = error.stderr || error.message || 'Unknown compilation error';
      success = false;
    }

    // Clean up temp dir (optional, but good practice)
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Failed to clean up temp dir', e);
    }

    // rustc output goes to stderr usually, so we'll combine them for the frontend
    const output = [stdout, stderr].filter(Boolean).join('\n');

    return new Response(JSON.stringify({
      success,
      stdout: output,
      stderr: output
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      stderr: `Server error: ${err.message}`
    }), { status: 500 });
  }
};
