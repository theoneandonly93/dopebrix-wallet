// AddressBook service: stores and retrieves recent addresses from localStorage
export const AddressBook = {
  getRecents(limit = 8) {
    try {
      const arr = JSON.parse(localStorage.getItem('fbx_addressbook') || '[]');
      return Array.isArray(arr) ? arr.slice(0, limit) : [];
    } catch { return []; }
  },
  addRecent(addr) {
    if (!addr || typeof addr !== 'string' || addr.length < 8) return;
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem('fbx_addressbook') || '[]'); } catch {}
    arr = arr.filter(a => a !== addr);
    arr.unshift(addr);
    if (arr.length > 20) arr = arr.slice(0, 20);
    try { localStorage.setItem('fbx_addressbook', JSON.stringify(arr)); } catch {}
  }
};
