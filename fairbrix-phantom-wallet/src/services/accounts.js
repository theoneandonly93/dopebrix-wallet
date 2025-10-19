import { create } from 'zustand';
import { useAuthStore } from './auth.js';

const LS_ACCOUNTS = 'fbrx_accounts';
const LS_ACTIVE = 'fbrx_accounts_active';

function loadAccounts() {
  try {
    const raw = localStorage.getItem(LS_ACCOUNTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveAccounts(list) {
  localStorage.setItem(LS_ACCOUNTS, JSON.stringify(list || []));
}

export const useAccounts = create((set, get) => ({
  accounts: [], // [{ label: 'Account 1' }]
  activeIndex: 0,

  init: () => {
    const list = loadAccounts();
    let activeIndex = parseInt(localStorage.getItem(LS_ACTIVE) || '0', 10);
    if (!list.length) {
      const first = { label: 'Account 1' };
      saveAccounts([first]);
      set({ accounts: [first], activeIndex: 0 });
      // ensure auth store label follows
      useAuthStore.getState().setWalletLabel(first.label);
      return;
    }
    if (activeIndex < 0 || activeIndex >= list.length) activeIndex = 0;
    set({ accounts: list, activeIndex });
    useAuthStore.getState().setWalletLabel(list[activeIndex]?.label || 'Account 1');
  },

  setActive: (index) => {
    const { accounts } = get();
    if (index < 0 || index >= accounts.length) return;
    localStorage.setItem(LS_ACTIVE, String(index));
    set({ activeIndex: index });
    const label = accounts[index]?.label || 'Account 1';
    useAuthStore.getState().setWalletLabel(label);
  },

  addAccount: () => {
    const { accounts } = get();
    const nextN = accounts.length + 1;
    const label = `Account ${nextN}`;
    const list = [...accounts, { label }];
    saveAccounts(list);
    set({ accounts: list });
  },

  renameAccount: (index, newLabel) => {
    const { accounts, activeIndex } = get();
    if (index < 0 || index >= accounts.length) return;
    const list = accounts.slice();
    list[index] = { ...list[index], label: newLabel };
    saveAccounts(list);
    set({ accounts: list });
    if (index === activeIndex) useAuthStore.getState().setWalletLabel(newLabel);
  },
}));

