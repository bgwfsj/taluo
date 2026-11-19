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
  all() {
    let arr = storeGet(STORE_KEYS.learned, []);
    // 兼容旧版：纯字符串数组 → 视为正位与逆位都已学习
    if (Array.isArray(arr) && arr.length && typeof arr[0] === 'string') {
      const migrated = [];
      arr.forEach(function (id) { migrated.push({ id: id, orient: 'upright' }, { id: id, orient: 'reversed' }); });
      arr = migrated;
      storeSet(STORE_KEYS.learned, arr);
    }
    return arr;
  },
  has(id, orient) { return this.all().some(function (x) { return x.id === id && x.orient === orient; }); },
  byCard(id) {
    const arr = this.all();
    return {
      upright: arr.some(function (x) { return x.id === id && x.orient === 'upright'; }),
      reversed: arr.some(function (x) { return x.id === id && x.orient === 'reversed'; })
    };
  },
  toggle(id, orient) {
    const arr = this.all();
    const idx = arr.findIndex(function (x) { return x.id === id && x.orient === orient; });
    if (idx >= 0) arr.splice(idx, 1); else arr.push({ id: id, orient: orient });
    storeSet(STORE_KEYS.learned, arr);
    return idx < 0;
  },
  count() { return this.all().length; },
  countOrient(orient) { return this.all().filter(function (x) { return x.orient === orient; }).length; },
  list(orient) { return this.all().filter(function (x) { return x.orient === orient; }).map(function (x) { return x.id; }); }
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

// ===== 抽牌记录（每次抽取追加一条，用于统计每张牌被抽到次数）=====
const HistoryStore = {
  all() { return storeGet(STORE_KEYS.history, []); },
  add(cardId, orientation) {
    const arr = this.all();
    arr.push({ date: todayKey(), cardId: cardId, orientation: orientation });
    if (arr.length > 2000) arr.splice(0, arr.length - 2000);
    storeSet(STORE_KEYS.history, arr);
  },
  counts() {
    const map = {};
    this.all().forEach(function (r) {
      const c = map[r.cardId] || { total: 0, upright: 0, reversed: 0 };
      c.total += 1;
      if (r.orientation === 'reversed') c.reversed += 1; else c.upright += 1;
      map[r.cardId] = c;
    });
    return map;
  },
  clear() { localStorage.removeItem(STORE_KEYS.history); }
};
