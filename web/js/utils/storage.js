const DBX_STORAGE_NS = 'dopebrix:v1';

export const store = {
  get(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(`${DBX_STORAGE_NS}:${key}`)); } catch { return fallback; }
  },
  set(key, value) {
    localStorage.setItem(`${DBX_STORAGE_NS}:${key}`, JSON.stringify(value));
  },
  remove(key) { localStorage.removeItem(`${DBX_STORAGE_NS}:${key}`); }
};

export function once(key) {
  const k = `${DBX_STORAGE_NS}:once:${key}`;
  if (localStorage.getItem(k)) return false;
  localStorage.setItem(k, '1');
  return true;
}

