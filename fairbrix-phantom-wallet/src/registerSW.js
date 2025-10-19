export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const v = '2';
      navigator.serviceWorker.register(`/sw.js?v=${v}`).catch(() => {});
    });
  }
}
