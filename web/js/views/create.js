import { clear, el, toast } from '../utils/ui.js';
import { createRune } from '../adapters/runes.js';
import { createInscription } from '../adapters/ordinals.js';
import { createToken as dbCreateToken, createNFT as dbCreateNFT, getAccount } from '../data/db.js';

export function renderCreate(root) {
  clear(root);
  const v = el(`
    <div class="grid" style="max-width:640px;margin:0 auto;gap:16px">
      <div class="title">Create</div>
      <div class="card">
        <div class="subtitle">Create Token (Runes)</div>
        <label class="label">Ticker</label>
        <input class="input" id="ticker" placeholder="TICK" />
        <label class="label">Supply</label>
        <input class="input" id="supply" inputmode="numeric" placeholder="1000000" />
        <label class="label">Decimals</label>
        <input class="input" id="decimals" inputmode="numeric" placeholder="6" />
        <button class="btn" id="createToken" style="margin-top:10px">Create Token</button>
      </div>
      <div class="card">
        <div class="subtitle">Create NFT (Ordinals)</div>
        <label class="label">Content (hex)</label>
        <textarea class="input" id="content" rows="4" placeholder="deadbeef..."></textarea>
        <button class="btn" id="createNft" style="margin-top:10px">Create NFT</button>
      </div>
    </div>
  `);
  root.appendChild(v);

  v.querySelector('#createToken').addEventListener('click', async () => {
    try {
      const ticker = v.querySelector('#ticker').value.trim();
      const supply = parseInt(v.querySelector('#supply').value || '0', 10);
      const decimals = parseInt(v.querySelector('#decimals').value || '0', 10);
      if (!ticker || supply <= 0) return toast('Enter ticker and supply');
      // Local create for full in-app flow
      const tok = dbCreateToken({ ticker, name: ticker, supply, decimals });
      toast('Token created');
      location.hash = `#token:${tok.id}`;
    } catch (e) { toast('Create failed'); }
  });

  v.querySelector('#createNft').addEventListener('click', async () => {
    try {
      const contentHex = v.querySelector('#content').value.trim();
      if (!contentHex) return toast('Enter content hex');
      const owner = getAccount()?.address || 'self';
      const nft = dbCreateNFT({ name: 'DopeBrix NFT', contentHex, owner });
      toast('NFT created');
      location.hash = `#nft:${nft.id}`;
    } catch (e) { toast('Create failed'); }
  });
}
