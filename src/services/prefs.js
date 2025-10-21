import { create } from 'zustand';

const LS = {
  lang: 'prefs_lang',
  fiat: 'prefs_fiat',
  search: 'prefs_search',
  haptics: 'prefs_haptics',
  explorerFairbrix: 'prefs_explorer_fairbrix',
  explorerDope: 'prefs_explorer_dope',
  explorerFairbrixCustom: 'prefs_explorer_fairbrix_custom',
  explorerDopeCustom: 'prefs_explorer_dope_custom',
  testnet: 'net_test',
  netFairbrix: 'net_fairbrix',
  netDope: 'net_dope',
};

function lsGet(k, d) { try { const v = localStorage.getItem(k); return v==null? d : v; } catch { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch {} }

export const usePrefs = create((set, get) => ({
  lang: lsGet(LS.lang, 'English'),
  fiat: lsGet(LS.fiat, 'USD'),
  search: lsGet(LS.search, 'Google'),
  haptics: lsGet(LS.haptics, '1') === '1',
  explorerFairbrix: lsGet(LS.explorerFairbrix, 'fairbrixscan'),
  explorerDope: lsGet(LS.explorerDope, 'dopa'),
  explorerFairbrixCustom: lsGet(LS.explorerFairbrixCustom, ''),
  explorerDopeCustom: lsGet(LS.explorerDopeCustom, ''),
  testnet: lsGet(LS.testnet, '0') === '1',
  netFairbrix: lsGet(LS.netFairbrix, 'mainnet'),
  netDope: lsGet(LS.netDope, 'mainnet'),

  setLang: (v) => { lsSet(LS.lang, v); set({ lang: v }); },
  setFiat: (v) => { lsSet(LS.fiat, v); set({ fiat: v }); },
  setSearch: (v) => { lsSet(LS.search, v); set({ search: v }); },
  setHaptics: (b) => { lsSet(LS.haptics, b ? '1' : '0'); set({ haptics: b }); },

  setExplorerFairbrix: (v) => { lsSet(LS.explorerFairbrix, v); set({ explorerFairbrix: v }); },
  setExplorerDope: (v) => { lsSet(LS.explorerDope, v); set({ explorerDope: v }); },
  setExplorerFairbrixCustom: (v) => { lsSet(LS.explorerFairbrixCustom, v); set({ explorerFairbrixCustom: v }); },
  setExplorerDopeCustom: (v) => { lsSet(LS.explorerDopeCustom, v); set({ explorerDopeCustom: v }); },
  setTestnet: (b) => { lsSet(LS.testnet, b ? '1' : '0'); set({ testnet: b }); },
  setNetFairbrix: (v) => { lsSet(LS.netFairbrix, v); set({ netFairbrix: v }); },
  setNetDope: (v) => { lsSet(LS.netDope, v); set({ netDope: v }); },
}));
