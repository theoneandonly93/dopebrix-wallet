export function el(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

export function modal(contentEl) {
  const root = document.getElementById('modal-root');
  const wrap = el(`<div class="modal-backdrop"><div class="modal"></div></div>`);
  wrap.querySelector('.modal').appendChild(contentEl);
  root.appendChild(wrap);
  function close() { root.removeChild(wrap); }
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  return { close, root: wrap };
}

export function toast(msg, timeout = 2500) {
  const t = el(`<div style="position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:#111;border:1px solid #1f1f1f;padding:10px 14px;border-radius:10px;color:#e5e5e5;z-index:50">${msg}</div>`);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), timeout);
}

export function sheet(contentEl) {
  const root = document.getElementById('modal-root');
  const wrap = el(`<div class="sheet-backdrop"><div class="sheet"><div class="sheet-handle"></div></div></div>`);
  wrap.querySelector('.sheet').appendChild(contentEl);
  root.appendChild(wrap);
  function close(){ root.removeChild(wrap); }
  wrap.addEventListener('click',(e)=>{ if (e.target===wrap) close(); });
  return { close, root: wrap };
}
