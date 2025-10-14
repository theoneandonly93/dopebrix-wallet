import { Config } from '../adapters/config.js';

export function fbxUsd() {
  // In a real app fetch from oracle/provider. For now, config-driven.
  const p = Number(Config.get('PRICE_FBX_USD', 0.01));
  return isFinite(p) && p > 0 ? p : 0.01;
}

export function formatUSD(v) {
  return `$${Number(v).toFixed(2)}`;
}

