import { clear, el } from '../utils/ui.js';
import { getNFT } from '../data/db.js';

export function renderNFT(root, id) {
  clear(root);
  const n = getNFT(id);
  if (!n) { root.appendChild(el('<div class="subtitle">NFT not found</div>')); return; }
  const v = el(`
    <div class="grid" style="gap:12px;max-width:640px;margin:0 auto">
      <div class="row space"><div class="title">${n.name}</div><div class="subtitle">ID: ${n.id}</div></div>
      <div class="card">
        <div class="subtitle">Owner: ${n.owner}</div>
        <div class="subtitle" style="word-break:break-all">Content (hex): ${n.contentHex}</div>
      </div>
    </div>
  `);
  root.appendChild(v);
}

