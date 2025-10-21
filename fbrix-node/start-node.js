import { execFile } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pick the correct binary. On WSL (linux), prefer fbrix, but fall back to fbrix.exe if that's what's available.
const primaryName = process.platform === 'win32' ? 'fbrix.exe' : 'fbrix';
const altName = primaryName === 'fbrix.exe' ? 'fbrix' : 'fbrix.exe';
const candidatePrimary = path.join(__dirname, primaryName);
const candidateAlt = path.join(__dirname, altName);
const exePath = fs.existsSync(candidatePrimary) ? candidatePrimary : (fs.existsSync(candidateAlt) ? candidateAlt : candidatePrimary);
const confPath = path.join(__dirname, 'fbx.conf');
const dataDir = path.join(__dirname, 'data');

function runNode() {
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
  const args = ['-conf=' + confPath, '-datadir=' + dataDir];
  const child = execFile(exePath, args, { windowsHide: true }, (error, stdout, stderr) => {
    if (error) {
      console.error('Fairbrix node failed to start:', error);
      console.error(`[fairbrix] Tried exec: ${exePath}`);
      if (!fs.existsSync(exePath)) {
        console.error('[fairbrix] Binary not found. Ensure fbrix/fbrix.exe exists in fbrix-node/.');
      }
      return;
    }
    if (stdout) console.log('Fairbrix node output:', stdout);
    if (stderr) console.error('Fairbrix node error:', stderr);
  });
  child.unref();
}

runNode();
