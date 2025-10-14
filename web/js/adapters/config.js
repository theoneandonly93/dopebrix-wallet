import { store } from '../utils/storage.js';

const KEY = 'config';

export const Config = {
  data: null,
  async load() {
    if (this.data) return this.data;
    // Try runtime override file
    let runtime = window.DOPEBRIX_DEFAULT_CONFIG || {};
    try {
      const res = await fetch('config.json', { cache: 'no-store' });
      if (res.ok) runtime = await res.json();
    } catch {}
    const saved = store.get(KEY, {});
    this.data = { ...runtime, ...saved };
    return this.data;
  },
  get(k, d) { return (this.data && this.data[k] !== undefined) ? this.data[k] : d; },
  set(k, v) { this.data[k] = v; store.set(KEY, this.data); },
};

