// Lightweight crypto utils for passcode-based encryption on device.

export async function randomBytes(len = 32) {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return b;
}

export function toHex(buf) {
  return Array.from(buf).map(b => b.toString(16).padStart(2,'0')).join('');
}

export function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i*2,2),16);
  return out;
}

export async function sha256(data) {
  const d = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const h = await crypto.subtle.digest('SHA-256', d);
  return new Uint8Array(h);
}

export async function deriveKey(passcode, salt, iterations = 150_000) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passcode), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, baseKey,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
}

export async function encrypt(passcode, data) {
  const iv = await randomBytes(12);
  const salt = await randomBytes(16);
  const key = await deriveKey(passcode, salt);
  const enc = new TextEncoder();
  const pt = typeof data === 'string' ? enc.encode(data) : data;
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);
  return { iv: toHex(iv), salt: toHex(salt), ct: toHex(new Uint8Array(ct)) };
}

export async function decrypt(passcode, payload) {
  const iv = fromHex(payload.iv);
  const salt = fromHex(payload.salt);
  const key = await deriveKey(passcode, salt);
  const ct = fromHex(payload.ct);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

export async function generateSeed() {
  // 32-byte entropy hex. TODO: integrate BIP39 if desired.
  return toHex(await randomBytes(32));
}

// Device-key encryption for remembering passcode on this device
async function deviceKey() {
  let keyHex = localStorage.getItem('DBX_DEVICE_KEY');
  if (!keyHex) { keyHex = toHex(await randomBytes(32)); localStorage.setItem('DBX_DEVICE_KEY', keyHex); }
  const key = await crypto.subtle.importKey('raw', fromHex(keyHex), { name: 'AES-GCM' }, false, ['encrypt','decrypt']);
  return key;
}

export async function deviceEncrypt(text) {
  const key = await deviceKey();
  const iv = await randomBytes(12);
  const enc = new TextEncoder().encode(text);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  return { iv: toHex(iv), ct: toHex(new Uint8Array(ct)) };
}

export async function deviceDecrypt(payload) {
  const key = await deviceKey();
  const iv = fromHex(payload.iv);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromHex(payload.ct));
  return new TextDecoder().decode(pt);
}
