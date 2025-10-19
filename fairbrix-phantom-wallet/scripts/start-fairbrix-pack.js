#!/usr/bin/env node
// Start Fairbrix-pack's START_Fairbrix.exe for convenience in dev
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function findPackExe() {
  const envExe = process.env.FAIRBRIX_PACK_EXE;
  if (envExe && fs.existsSync(envExe)) return envExe;

  const envDir = process.env.FAIRBRIX_PACK_DIR;
  if (envDir) {
    const p = path.resolve(envDir, 'START_Fairbrix.exe');
    if (fs.existsSync(p)) return p;
  }

  const candidates = [
    path.resolve(process.cwd(), 'Fairbrix-pack', 'START_Fairbrix.exe'),
    path.resolve(process.cwd(), '..', 'Fairbrix-pack', 'START_Fairbrix.exe'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return '';
}

function start() {
  const exe = findPackExe();
  if (!exe) {
    console.error('[fairbrix-pack] Could not find START_Fairbrix.exe. Set FAIRBRIX_PACK_DIR or FAIRBRIX_PACK_EXE.');
    process.exit(1);
  }
  try {
    const child = spawn(exe, [], { stdio: 'ignore', windowsHide: true, detached: true });
    child.unref();
    console.log('[fairbrix-pack] started:', exe);
  } catch (e) {
    console.error('[fairbrix-pack] failed to start:', e?.message || e);
    process.exit(2);
  }
}

start();

