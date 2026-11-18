// ===== UI 基础组件 =====
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
}

function openModal(title, bodyHTML, actions) {
  const root = document.getElementById('modal-root');
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML =
    '<div class="modal" role="dialog" aria-modal="true">' +
    '<div class="sheet-handle"></div>' +
    '<h3>' + title + '</h3>' + bodyHTML +
    '<div class="modal-actions"></div>' +
    '</div>';
  const actionsEl = mask.querySelector('.modal-actions');
  if (Array.isArray(actions)) { actions.forEach(function (a) { if (a) actionsEl.appendChild(a); }); }
  else if (actions) { actionsEl.appendChild(actions); }
  root.appendChild(mask);
  mask.addEventListener('click', function (e) {
    if (e.target === mask) closeModal();
  });
  return function close() { closeModal(); };
}
function closeModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
}
function modalBtn(label, cls, handler) {
  const b = document.createElement('button');
  b.className = 'btn ' + (cls || 'btn-primary');
  b.style.flex = '1';
  b.textContent = label;
  b.addEventListener('click', handler);
  return b;
}

// 图标
const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 18.5z"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.2-3.2 3.9-5 7-5s5.8 1.8 7 5"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8z"/></svg>'
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
