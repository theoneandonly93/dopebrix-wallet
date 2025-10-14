import { clear, el, modal, toast } from '../utils/ui.js';
import { store } from '../utils/storage.js';
import { generateSeed, encrypt, decrypt, randomBytes, toHex, deviceEncrypt, deviceDecrypt } from '../utils/crypto.js';
import { ensureAccount } from '../data/db.js';

const KEY_WALLET = 'wallet';

function hasWallet() { return !!store.get(KEY_WALLET); }

export function isUnlocked() { return !!window.__DBX?.seed; }

export function ensureState() { if (!window.__DBX) window.__DBX = { seed: null, faceId: null }; }

export function renderOnboarding(root) {
  ensureState();
  clear(root);

  if (!hasWallet()) {
    const view = el(`
      <div class="hero">
        <div class="logo">DB</div>
        <div class="title">Welcome to DopeBrix</div>
        <div class="subtitle">All-in-one Fairbrix wallet + launchpad</div>
        <button class="btn" id="getStarted">Get Started</button>
      </div>
    `);
    root.appendChild(view);
    view.querySelector('#getStarted').addEventListener('click', () => setupWallet(root));
    return;
  }

  // Unlock with keypad
  keypadPrompt(root, {
    title: 'Unlock Wallet',
    subtitle: 'Enter your passcode',
    minLen: 6,
    rememberOption: true,
    extras: (wrap) => {
      const btn = el('<button class="btn secondary" style="margin-top:10px">Use Face ID</button>');
      btn.addEventListener('click', tryFaceUnlock);
      wrap.appendChild(btn);
    }
  }).then(async ({ value, remember }) => {
    await tryUnlock(value);
    if (remember) {
      const enc = await deviceEncrypt(value);
      store.set('remember', enc);
    }
  }).catch(()=>{});
}

async function setupWallet(root) {
  clear(root);
  const seed = await generateSeed();
  const state = { seed, passProtected: false, webauthnId: null };

  // Create + confirm passcode using keypad
  try {
    const res1 = await keypadPrompt(root, { title: 'Secure Your Wallet', subtitle: 'Create a 6+ digit passcode', minLen: 6, rememberOption: true });
    const pass1 = typeof res1==='string'? res1 : res1.value;
    const remember = typeof res1==='string'? false : !!res1.remember;
    const pass2 = await keypadPrompt(root, { title: 'Confirm Passcode', subtitle: 'Re-enter your passcode', minLen: 6 });
    const p2 = typeof pass2==='string'? pass2 : pass2.value;
    if (pass1 !== p2) { toast('Passcodes do not match'); return setupWallet(root); }
    const enc = await encrypt(pass1, seed);
    store.set(KEY_WALLET, { enc, createdAt: Date.now(), webauthnId: null });
    window.__DBX.seed = seed;
    await ensureAccount(seed);
    if (remember) { const encp = await deviceEncrypt(pass1); store.set('remember', encp); }
    await promptFaceId(root);
  } catch {
    // canceled
  }
}

async function promptFaceId(root) {
  clear(root);
  const v = el(`
    <div class="grid" style="max-width:560px;margin:0 auto">
      <div class="title">Enable Face ID</div>
      <div class="subtitle">Optional, recommended on mobile. You’ll still use your passcode as backup.</div>
      <div class="row">
        <button class="btn" id="enable">Enable Face ID</button>
        <button class="btn secondary" id="skip">Skip</button>
      </div>
    </div>
  `);
  root.appendChild(v);
  v.querySelector('#enable').addEventListener('click', async () => {
    try {
      const id = await registerWebAuthn();
      const w = store.get(KEY_WALLET);
      w.webauthnId = toHex(id);
      store.set(KEY_WALLET, w);
      toast('Face ID enabled');
      await showBackup(root);
    } catch (e) {
      toast('Face ID setup failed');
      await showBackup(root);
    }
  });
  v.querySelector('#skip').addEventListener('click', async () => showBackup(root));
}

async function showBackup(root) {
  clear(root);
  const seed = window.__DBX.seed;
  const v = el(`
    <div class="grid" style="max-width:560px;margin:0 auto">
      <div class="title">Recovery Secret</div>
      <div class="subtitle">Write this secret down and store offline.</div>
      <div class="card" style="word-break: break-all">${seed}</div>
      <button class="btn" id="done">I Saved It</button>
    </div>
  `);
  root.appendChild(v);
  v.querySelector('#done').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('dbx:unlocked'));
  });
}

async function tryUnlock(passcode) {
  const w = store.get(KEY_WALLET);
  if (!w) return toast('No wallet found');
  try {
    const seed = await decrypt(passcode, w.enc);
    window.__DBX.seed = seed;
    await ensureAccount(seed);
    window.dispatchEvent(new CustomEvent('dbx:unlocked'));
  } catch (e) { toast('Invalid passcode'); }
}

async function tryFaceUnlock() {
  const w = store.get(KEY_WALLET);
  if (!w?.webauthnId) return toast('Face ID not enabled');
  try {
    await getWebAuthn(new Uint8Array(w.webauthnId.match(/.{1,2}/g).map(h=>parseInt(h,16))));
    // Success implies user presence/verification; prompt for passcode as well (keypad)
    const passcode = await keypadPrompt(document.getElementById('view'), { title: 'Enter Passcode', subtitle: 'Required with Face ID', minLen: 6 });
    await tryUnlock(passcode);
  } catch (e) { toast('Face ID failed'); }
}

async function registerWebAuthn() {
  const userId = await randomBytes(16);
  const pubKey = {
    challenge: await randomBytes(32),
    rp: { name: 'DopeBrix' },
    user: { id: userId, name: 'user@dopebrix', displayName: 'DopeBrix User' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
    timeout: 60000, attestation: 'none'
  };
  const cred = await navigator.credentials.create({ publicKey: pubKey });
  return new Uint8Array(cred.rawId);
}

async function getWebAuthn(rawId) {
  const req = {
    challenge: await randomBytes(32),
    allowCredentials: [{ type: 'public-key', id: rawId }],
    userVerification: 'required',
    timeout: 60000
  };
  return navigator.credentials.get({ publicKey: req });
}

// Keypad prompt helper
function keypadPrompt(root, { title, subtitle, minLen = 6, extras, rememberOption = false, returnMeta = true } = {}) {
  return new Promise((resolve, reject) => {
    clear(root);
    const v = el(`
      <div class="grid" style="max-width:360px;margin:0 auto;gap:12px">
        <div class="title">${title}</div>
        <div class="subtitle">${subtitle || ''}</div>
        <div class="row center" id="dots" style="gap:8px"></div>
        <div class="keypad-grid">
          ${[1,2,3,4,5,6,7,8,9,'clr',0,'del'].map(k =>
            `<button class="key" data-k="${k}">${k==='del'?'⌫':k==='clr'?'Clear':k}</button>`).join('')}
        </div>
        ${rememberOption? '<label class="row" style="gap:8px"><input type="checkbox" id="remember" /> <span class="subtitle">Remember on this device</span></label>': ''}
        <button class="btn" id="ok" disabled>Continue</button>
      </div>
    `);
    root.appendChild(v);
    const dots = v.querySelector('#dots');
    const ok = v.querySelector('#ok');
    let buf = '';
    function renderDots() {
      dots.innerHTML = '';
      const len = Math.max(minLen, 6);
      for (let i=0;i<len;i++) {
        const d = el(`<span class="dot${i<buf.length?' filled':''}"></span>`);
        dots.appendChild(d);
      }
      ok.disabled = buf.length < minLen;
    }
    renderDots();
    v.querySelectorAll('.key').forEach(b => b.addEventListener('click', () => {
      const k = b.getAttribute('data-k');
      if (k === 'del') buf = buf.slice(0,-1);
      else if (k === 'clr') buf = '';
      else if (/^\d$/.test(k)) buf = (buf + k).slice(0, 12);
      renderDots();
    }));
    ok.addEventListener('click', () => {
      const remember = rememberOption ? v.querySelector('#remember').checked : false;
      resolve(returnMeta ? { value: buf, remember } : buf);
    });
    if (typeof extras === 'function') extras(v);
  });
}

export async function unlockWithPasscode(pass) { await tryUnlock(pass); }
