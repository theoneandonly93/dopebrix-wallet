import { clear, el } from '../utils/ui.js';

const ALLOW = [ 'https://fairbrix.org', 'https://example.com' ];

export function renderBrowser(root) {
  clear(root);
  const v = el(`
    <div class="grid" style="gap:8px;height:100%">
      <div class="row">
        <input class="input" id="url" placeholder="https://" />
        <button class="btn" id="go">Go</button>
      </div>
      <div style="flex:1;min-height:60vh;border:1px solid var(--border);border-radius:12px;overflow:hidden">
        <iframe id="frame" style="width:100%;height:70vh;background:#0b0b0b" sandbox="allow-scripts allow-forms allow-same-origin"></iframe>
      </div>
    </div>
  `);
  root.appendChild(v);

  v.querySelector('#go').addEventListener('click', () => {
    const u = v.querySelector('#url').value.trim();
    try {
      const URLU = new URL(u);
      if (!ALLOW.includes(`${URLU.protocol}//${URLU.host}`)) {
        alert('Destination not allowlisted');
        return;
      }
      v.querySelector('#frame').src = u;
    } catch { alert('Invalid URL'); }
  });
}

