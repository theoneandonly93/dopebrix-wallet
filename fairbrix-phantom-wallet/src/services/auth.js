import { create } from 'zustand';
import * as scureBip39 from '@scure/bip39';
import { wordlist as EN_WORDS } from '@scure/bip39/wordlists/english';

const LS = {
  walletLabel: 'fbrx_wallet_label',
  passHash: 'fbrx_pass_hash',
  biometric: 'fbrx_bio_enabled',
  seed: 'fbrx_seed_phrase',
  seedBacked: 'fbrx_seed_backed',
};

function sha256(text) {
  const enc = new TextEncoder();
  return crypto.subtle.digest('SHA-256', enc.encode(text)).then(buf =>
    Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
  );
}

export const useAuthStore = create((set, get) => ({
  isUnlocked: false,
  walletLabel: '',
  biometricEnabled: false,
  seedBacked: false,

  initFromStorage: () => {
    const label = localStorage.getItem(LS.walletLabel) || '';
    const biometric = localStorage.getItem(LS.biometric) === '1';
    const seedBacked = localStorage.getItem(LS.seedBacked) === '1';
    set({ walletLabel: label, biometricEnabled: biometric, seedBacked });
  },

  createOrLoadWallet: async (passcode) => {
    if (!passcode || passcode.length < 4) throw new Error('Passcode must be at least 4 characters');
    const passHash = await sha256(passcode);
    const existing = localStorage.getItem(LS.passHash);
    if (existing && existing !== passHash) throw new Error('Passcode mismatch for existing wallet');
    localStorage.setItem(LS.passHash, passHash);
    const label = 'pwa-' + passHash.slice(0, 8);
    localStorage.setItem(LS.walletLabel, label);
    // Ensure a seed exists
    try {
      const existingSeed = localStorage.getItem(LS.seed);
      if (!existingSeed) {
        const seed = generateSeed12();
        localStorage.setItem(LS.seed, seed);
      }
    } catch {}
    const seedBacked = localStorage.getItem(LS.seedBacked) === '1';
    set({ isUnlocked: true, walletLabel: label, seedBacked });
  },

  unlockWithPasscode: async (passcode) => {
    const passHash = await sha256(passcode);
    const stored = localStorage.getItem(LS.passHash);
    if (!stored || stored !== passHash) throw new Error('Invalid passcode');
    const label = localStorage.getItem(LS.walletLabel) || 'pwa-' + passHash.slice(0,8);
    const seedBacked = localStorage.getItem(LS.seedBacked) === '1';
    set({ isUnlocked: true, walletLabel: label, seedBacked });
  },

  setWalletLabel: (label) => {
    try { localStorage.setItem(LS.walletLabel, label); } catch {}
    set({ walletLabel: label });
  },

  enableBiometric: async () => {
    if (!window.PublicKeyCredential) return;
    const challenge = crypto.getRandomValues(new Uint8Array(16));
    const pubKey = {
      challenge,
      rp: { name: 'DOPE Wallet', id: window.location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(32)),
        name: 'dope-user',
        displayName: 'DOPE User'
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }], // ES256
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', requireResidentKey: false },
      timeout: 60000,
    };
    try {
      await navigator.credentials.create({ publicKey: pubKey });
      localStorage.setItem(LS.biometric, '1');
      set({ biometricEnabled: true });
    } catch (e) {
      console.warn('Biometric enable failed', e);
    }
  },

  disableBiometric: () => {
    localStorage.removeItem(LS.biometric);
    set({ biometricEnabled: false });
  },

  tryBiometric: async () => {
    if (!window.PublicKeyCredential) throw new Error('No WebAuthn');
    const challenge = crypto.getRandomValues(new Uint8Array(16));
    const pubKey = {
      challenge,
      rpId: window.location.hostname,
      timeout: 60000,
      userVerification: 'required',
      allowCredentials: []
    };
    const cred = await navigator.credentials.get({ publicKey: pubKey });
    if (cred) {
      const label = localStorage.getItem(LS.walletLabel) || 'pwa-wallet';
      set({ isUnlocked: true, walletLabel: label });
    } else {
      throw new Error('Biometric unlock failed');
    }
  },

  // Security helpers
  verifyPasscode: async (passcode) => {
    const passHash = await sha256(passcode);
    const stored = localStorage.getItem(LS.passHash);
    return !!stored && stored === passHash;
  },
  getSeed: () => {
    try {
      let seed = localStorage.getItem(LS.seed);
      if (!seed) { seed = generateSeed12(); localStorage.setItem(LS.seed, seed); }
      return seed;
    } catch { return ''; }
  },
  setSeedBacked: (b) => { try { localStorage.setItem(LS.seedBacked, b ? '1' : '0'); } catch {} set({ seedBacked: !!b }); },

  // Seed utilities
  isWeakSeed: (s) => {
    try {
      const parts = String(s || '').trim().split(/\s+/).filter(Boolean);
      if (parts.length !== 12) return false;
      const uniq = new Set(parts.map(w => w.toLowerCase()));
      return uniq.size === 1; // all words identical
    } catch { return false; }
  },
  regenerateSeed: async () => {
    const phrase = generateSeed12();
    try { localStorage.setItem(LS.seed, phrase); localStorage.setItem(LS.seedBacked, '0'); } catch {}
    set({ seedBacked: false });
    return phrase;
  },
}));

// --- Seed generation
// Prefer BIP39 12-word English mnemonic; fallback to local wordlist with proper RNG
const WORDS = (
  'able about above access actor adapt adjust adult afford agent album alert alley alpha alter amber angel apple april arena argue arrow asset assist atom audit author awake axis bacon badge bag ball bamboo banana base basic basket battery beach bean beauty because become beef before begin belief belong benefit best beta between bicycle biology bird birth bitter black blade blanket bless blossom blue boast boat body bolt bonus book boost border boring borrow boss bottle bottom bounce box boy brain brave brick bridge brief bright bring brisk bubble buddy budget buffalo build bulk bullet bundle bunker burden burger burst bus business busy butter cable cactus cage cake calm camera candle candy canvas canyon capable capital captain carbon cargo carpet carry cart case cash casino castle casual catalog catch category cause caution cave ceiling celery cement census century cereal certain chair chalk champion change chaos chapter charge chase chat cheap check cheese chef cherry chest chief child chimney choice choose chronic chunk cinnamon circle citizen city civil claim clap clarify class clay click client cliff clinic clock clog close cloth cloud clown club cluster coach coast coconut code coffee coil coin collect color column combine comfort comic common company concert conduct confirm control cook cool copper copy coral core corn correct cosmic cost cotton couch country couple course cousin cover coyote crack craft crane crash crawl crazy cream credit creek crew cricket crime crisp critic crop cross crowd crucial cruel cruise crumble crunch crush crystal cube culture cup curious current curtain curve custom cute cycle')
  .split(/\s+/);

function generateSeed12() {
  try {
    // Use BIP39 for stronger/more standard mnemonics
    return scureBip39.generateMnemonic(EN_WORDS, 128);
  } catch {}
  // Fallback: 12 words from local list using secure RNG
  const out = [];
  const bytes = new Uint8Array(12);
  try {
    const cryptoObj = (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function')
      ? globalThis.crypto
      : (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function' ? window.crypto : null);
    if (cryptoObj) cryptoObj.getRandomValues(bytes);
    else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < 12; i++) {
    const idx = bytes[i] % WORDS.length;
    out.push(WORDS[idx]);
  }
  return out.join(' ');
}

