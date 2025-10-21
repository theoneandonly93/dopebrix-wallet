// Unified wallet module for FBX (Fairbrix) and DOPE (L2 identity)
// Pure browser-friendly stack: @scure + @noble and b58c
import * as scureBip39 from '@scure/bip39';
import { wordlist as EN_WORDS } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import baseX from 'base-x';

const b58 = baseX('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

// Allow overriding network bytes via env to match Fairbrix-pack if needed
function parseEnvByte(v, def) {
  try {
    if (v === undefined || v === null || v === '') return def;
    const s = String(v).trim();
    if (/^0x/i.test(s)) return Number.parseInt(s, 16);
    if (/^[0-9]+$/.test(s)) return Number.parseInt(s, 10);
    return def;
  } catch { return def; }
}
function parseEnvBool(v, def) {
  if (v === undefined || v === null || v === '') return def;
  const s = String(v).trim().toLowerCase();
  if (['1','true','yes','y','on'].includes(s)) return true;
  if (['0','false','no','n','off'].includes(s)) return false;
  return def;
}

const NETWORK = {
  // Explorer confirms Fairbrix P2PKH version byte is 0x5F (95): addresses like fXP...
  pubKeyHash: parseEnvByte(import.meta.env.VITE_FAIRBRIX_PKH, 0x5f),
  // Many Bitcoin-descendants use WIF = 0x80 + (P2PKH & 0x7f). Keep 0x80 default unless overridden.
  wif: parseEnvByte(import.meta.env.VITE_FAIRBRIX_WIF, 0x80),
  compressed: parseEnvBool(import.meta.env.VITE_FAIRBRIX_COMPRESSED, true),
};

// --- utils ---
async function sha256Hex(input) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const len = hex.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function bytesToBase64(u8) {
  if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
  let str = '';
  for (let i = 0; i < u8.length; i++) str += String.fromCharCode(u8[i]);
  return btoa(str);
}

function base64ToBytes(b64) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// --- encryption helpers (AES-GCM via PBKDF2) ---
async function deriveAesKeyFromPassHash(passHashHex, salt) {
  const passBytes = hexToBytes(passHashHex);
  const keyMaterial = await crypto.subtle.importKey('raw', passBytes, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptWifToStorage(wif) {
  try {
    const passHash = localStorage.getItem('fbrx_pass_hash');
    if (!passHash) throw new Error('Missing passcode');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKeyFromPassHash(passHash, salt);
    const enc = new TextEncoder();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(wif));
    localStorage.setItem('fbx_wif_enc', bytesToBase64(new Uint8Array(ct)));
    localStorage.setItem('fbx_wif_salt', bytesToBase64(salt));
    localStorage.setItem('fbx_wif_iv', bytesToBase64(iv));
    return true;
  } catch (e) {
    console.warn('WIF encrypt failed:', e?.message || e);
    return false;
  }
}

export async function decryptWifFromStorage() {
  try {
    const passHash = localStorage.getItem('fbrx_pass_hash');
    const b64 = localStorage.getItem('fbx_wif_enc');
    const b64Salt = localStorage.getItem('fbx_wif_salt');
    const b64Iv = localStorage.getItem('fbx_wif_iv');
    if (!passHash || !b64 || !b64Salt || !b64Iv) return '';
    const salt = base64ToBytes(b64Salt);
    const iv = base64ToBytes(b64Iv);
    const key = await deriveAesKeyFromPassHash(passHash, salt);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBytes(b64));
    return new TextDecoder().decode(pt);
  } catch (e) {
    console.warn('WIF decrypt failed:', e?.message || e);
    return '';
  }
}

// --- base58check helpers ---
function p2pkhAddressFromPriv(priv32) {
  const pub = secp.getPublicKey(priv32, !!NETWORK.compressed);
  const h160 = ripemd160(sha256(pub));
  const payload = new Uint8Array(1 + h160.length);
  payload[0] = NETWORK.pubKeyHash;
  payload.set(h160, 1);
  return encode58Check(payload);
}

function wifFromPriv(priv32) {
  const compressed = !!NETWORK.compressed;
  const payload = new Uint8Array(1 + 32 + (compressed ? 1 : 0));
  payload[0] = NETWORK.wif;
  payload.set(priv32, 1);
  if (compressed) payload[33] = 0x01; // compressed flag
  return encode58Check(payload);
}

function encode58Check(u8){ const chk = sha256(sha256(u8)); const full = new Uint8Array(u8.length+4); full.set(u8,0); full.set(chk.slice(0,4), u8.length); return b58.encode(full); }
// --- derivation ---
export async function deriveFairbrixFromMnemonic(mnemonic) {
  const phrase = String(mnemonic || '').trim();
  let priv;
  if (scureBip39.validateMnemonic(phrase, EN_WORDS)) {
    const seed = scureBip39.mnemonicToSeedSync(phrase);
    const root = HDKey.fromMasterSeed(seed);
    const child = root.derive("m/44'/236'/0'/0/0");
    priv = child.privateKey;
  } else {
    const privHex = await sha256Hex(phrase + '|FBX');
    priv = hexToBytes(privHex);
  }
  const address = p2pkhAddressFromPriv(priv);
  const wif = wifFromPriv(priv);
  return { address, wif };
}

export async function createUnifiedWallet(mnemonic) {
  let phrase = (mnemonic || '').trim();
  if (!phrase) {
    // Prefer existing seed from auth store if present
    try {
      const { useAuthStore } = await import('../../services/auth.js');
      phrase = useAuthStore.getState().getSeed();
    } catch {
      phrase = scureBip39.generateMnemonic(EN_WORDS, 128);
    }
  }
  const fbx = await deriveFairbrixFromMnemonic(phrase);
  // For L2, identity is the same address (simple mapping)
  const dope = { address: fbx.address };
  return { mnemonic: phrase, fbx, dope };
}

export async function saveUnifiedWallet({ mnemonic, fbx, dope }) {
  try {
    if (mnemonic) localStorage.setItem('seed', mnemonic);
    if (fbx?.address) localStorage.setItem('fbx_addr', fbx.address);
    if (dope?.address) localStorage.setItem('dope_addr', dope.address);
    if (fbx?.wif) await encryptWifToStorage(fbx.wif);
    return true;
  } catch (e) {
    console.warn('Save unified wallet failed:', e?.message || e);
    return false;
  }
}
