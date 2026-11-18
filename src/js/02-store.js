// ===== 本地存储 =====
function storeGet(key, def) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? def : JSON.parse(raw);
  } catch (e) { return def; }
}
function storeSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch (e) { console.warn('storeSet failed', key, e); }
}

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const NotesStore = {
  all() { return storeGet(STORE_KEYS.notes, {}); },
  forCard(id) {
    const arr = storeGet(STORE_KEYS.notes, {})[id] || [];
    return arr.slice().sort((a, b) => b.ts - a.ts);
  },
  add(id, text) {
    const all = storeGet(STORE_KEYS.notes, {});
    (all[id] = all[id] || []).push({ text: text.trim(), ts: Date.now() });
    storeSet(STORE_KEYS.notes, all);
  },
  update(id, ts, text) {
    const all = storeGet(STORE_KEYS.notes, {});
    const arr = all[id] || [];
    const item = arr.find(x => x.ts === ts);
    if (item) item.text = text.trim();
    storeSet(STORE_KEYS.notes, all);
  },
  remove(id, ts) {
    const all = storeGet(STORE_KEYS.notes, {});
    all[id] = (all[id] || []).filter(x => x.ts !== ts);
    if (!all[id].length) delete all[id];
    storeSet(STORE_KEYS.notes, all);
  }
};

const LearnedStore = {
  all() { return storeGet(STORE_KEYS.learned, []); },
  has(id) { return storeGet(STORE_KEYS.learned, []).includes(id); },
  toggle(id) {
    const arr = storeGet(STORE_KEYS.learned, []);
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(id);
    storeSet(STORE_KEYS.learned, arr);
    return idx < 0;
  },
  count() { return storeGet(STORE_KEYS.learned, []).length; },
  list() { return storeGet(STORE_KEYS.learned, []); }
};

const TodayStore = {
  get() { return storeGet(STORE_KEYS.today, null); },
  isToday() {
    const t = storeGet(STORE_KEYS.today, null);
    return !!t && t.date === todayKey();
  },
  set(cardId, orientation) { storeSet(STORE_KEYS.today, { date: todayKey(), cardId, orientation }); },
  clear() { localStorage.removeItem(STORE_KEYS.today); }
};
