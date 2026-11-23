// ===== 无头回归自检（仅当 URL 带 ?selftest 时运行）=====
function runSelfTest() {
  const results = [];
  const pass = function (name) { results.push('PASS ' + name); };
  const fail = function (name, msg) { results.push('FAIL ' + name + (msg ? ': ' + msg : '')); };

  // 1) 数据完整性
  try {
    if (TAROT_CARDS.length !== 78) fail('data-count', 'expected 78, got ' + TAROT_CARDS.length);
    else pass('data-count-78');

    const ids = new Set(); let dup = null;
    TAROT_CARDS.forEach(function (c) { if (ids.has(c.id)) dup = c.id; ids.add(c.id); });
    if (dup) fail('data-unique', dup); else pass('data-unique');

    const missing = [];
    TAROT_CARDS.forEach(function (c) {
      if (!c.name || !c.nameEn || !c.desc) missing.push(c.id);
      if (!c.upright || !c.upright.summary || !Array.isArray(c.upright.keywords) || !c.upright.keywords.length) missing.push(c.id + ':u');
      if (!c.reversed || !c.reversed.summary || !Array.isArray(c.reversed.keywords) || !c.reversed.keywords.length) missing.push(c.id + ':r');
    });
    if (missing.length) fail('data-fields', missing.join(','));
    else pass('data-fields');

    const badDims = [];
    TAROT_CARDS.forEach(function (c) {
      ['upright', 'reversed'].forEach(function (o) {
        const today = todayReadingFor(c, o);
        DIMENSIONS.forEach(function (d) {
          if (!today[d.key] || !String(today[d.key]).trim()) badDims.push(c.id + ':' + o + ':' + d.key);
        });
      });
    });
    if (badDims.length) fail('dims', badDims.slice(0, 5).join(','));
    else pass('dims-all-cards');
  } catch (e) { fail('data-exception', e.message); }

  // 1.6) 今日解读增强完整性（主题 / 宜 / 忌 / 寄语 / 幸运）
  try {
    const badExtra = [];
    TAROT_CARDS.forEach(function (c) {
      ['upright', 'reversed'].forEach(function (o) {
        const ex = todayExtraFor(c, o);
        if (!ex.theme || !String(ex.theme).trim()) badExtra.push(c.id + ':' + o + ':theme');
        if (!ex.overview || String(ex.overview).length < 30) badExtra.push(c.id + ':' + o + ':overview');
        if (!Array.isArray(ex.do) || ex.do.length < 3) badExtra.push(c.id + ':' + o + ':do');
        if (!Array.isArray(ex.dont) || ex.dont.length < 3) badExtra.push(c.id + ':' + o + ':dont');
        if (!ex.bless || !String(ex.bless).trim()) badExtra.push(c.id + ':' + o + ':bless');
        if (!ex.lucky || !ex.lucky.color || !ex.lucky.number || !ex.lucky.direction || !ex.lucky.time) badExtra.push(c.id + ':' + o + ':lucky');
      });
    });
    if (badExtra.length) fail('today-extra', badExtra.slice(0, 6).join(','));
    else pass('today-extra-all-cards');
    const dimsLong = [];
    TAROT_CARDS.forEach(function (c) {
      ['upright', 'reversed'].forEach(function (o) {
        const today = todayReadingFor(c, o);
        DIMENSIONS.forEach(function (d) {
          const len = String(today[d.key] || '').length;
          if (len < 24) dimsLong.push(c.id + ':' + o + ':' + d.key + '=' + len);
        });
      });
    });
    if (dimsLong.length) fail('dims-rich', dimsLong.slice(0, 5).join(','));
    else pass('dims-rich-content');
    const c0 = TAROT_CARDS[0];
    const l1 = luckyFor(c0, 'upright');
    const l2 = luckyFor(c0, 'upright');
    if (l1.number !== l2.number || l1.color.hex !== l2.color.hex) fail('lucky-deterministic');
    else pass('lucky-deterministic');
  } catch (e) { fail('today-extra-exception', e.message); }

  // 1.5) 牌面图片数据完整性
  try {
    const missingImg = TAROT_CARDS.filter(function (c) { return !CARD_IMAGES[c.id] || CARD_IMAGES[c.id].indexOf('data:image/jpeg;base64,') !== 0; });
    if (missingImg.length) fail('card-images', missingImg.slice(0, 5).join(','));
    else pass('card-images-78');
    if (!CARD_BACK_IMAGE || CARD_BACK_IMAGE.indexOf('data:image/jpeg;base64,') !== 0) fail('card-back-image');
    else pass('card-back-image');
  } catch (e) { fail('img-exception', e.message); }

  // 2) 存储读写  // 2) 存储读写
  try {
    const orig = {
      notes: storeGet(STORE_KEYS.notes, {}),
      learned: storeGet(STORE_KEYS.learned, []),
      today: storeGet(STORE_KEYS.today, null)
    };
    const id = TAROT_CARDS[0].id;
    NotesStore.add(id, '自检备注');
    const arr = NotesStore.forCard(id);
    if (!arr.length || arr[0].text !== '自检备注') fail('notes-add'); else pass('notes-add');
    NotesStore.update(id, arr[0].ts, '已更新');
    if (NotesStore.forCard(id)[0].text !== '已更新') fail('notes-update'); else pass('notes-update');
    NotesStore.remove(id, arr[0].ts);
    if (NotesStore.forCard(id).length) fail('notes-remove'); else pass('notes-remove');

    const t0 = LearnedStore.toggle(id, 'upright');
    const t1 = LearnedStore.toggle(id, 'upright');
    if (t0 !== true || t1 !== false) fail('learned-toggle'); else pass('learned-toggle');
    LearnedStore.toggle(id, 'reversed');
    if (!LearnedStore.has(id, 'reversed') || LearnedStore.has(id, 'upright')) fail('learned-orient'); else pass('learned-orient');
    LearnedStore.toggle(id, 'reversed');

    TodayStore.set(id, 'reversed');
    const t = TodayStore.get();
    if (!t || t.cardId !== id || t.orientation !== 'reversed') fail('today-store'); else pass('today-store');
    TodayStore.clear();

    const origHistory = storeGet(STORE_KEYS.history, []);
    localStorage.removeItem(STORE_KEYS.history);
    HistoryStore.add(id, 'upright');
    HistoryStore.add(id, 'upright');
    HistoryStore.add(id, 'reversed');
    const hCounts = HistoryStore.counts();
    if (!hCounts[id] || hCounts[id].total !== 3 || hCounts[id].upright !== 2 || hCounts[id].reversed !== 1) fail('history-counts'); else pass('history-counts');
    storeSet(STORE_KEYS.history, origHistory);

    storeSet(STORE_KEYS.notes, orig.notes);
    storeSet(STORE_KEYS.learned, orig.learned);
    if (orig.today) storeSet(STORE_KEYS.today, orig.today); else localStorage.removeItem(STORE_KEYS.today);
  } catch (e) { fail('store-exception', e.message); }

  // 3) 页面渲染冒烟
  try {
    renderHome();
    if (!document.querySelector('#view-home .tarot-card')) fail('ui-home'); else pass('ui-home');

    TodayStore.set(TAROT_CARDS[0].id, 'upright');
    renderHome();
    const resultEl = document.getElementById('today-result');
    const hasResult = resultEl && resultEl.innerHTML.indexOf('orientation-badge upright') >= 0 && resultEl.innerHTML.indexOf(TAROT_CARDS[0].name) >= 0;
    if (!hasResult) fail('ui-today-result'); else pass('ui-today-result');
    if (!document.querySelector('#view-home #notes-panel #note-input')) fail('ui-today-notes'); else pass('ui-today-notes');
    if (!document.querySelector('#view-home #draw-history')) fail('ui-draw-history'); else pass('ui-draw-history');
    TodayStore.clear();

    Router.go('glossary'); renderGlossary();
    const rowCount = document.querySelectorAll('#view-glossary .card-row').length;
    if (rowCount !== 78) fail('ui-glossary-count', 'expected 78, got ' + rowCount); else pass('ui-glossary-count');

    const firstRow = document.querySelector('#view-glossary .card-row');
    firstRow.click();
    if (Router.current !== 'detail' || !document.querySelector('#view-detail #note-input')) fail('glossary-nav-detail');
    else pass('glossary-nav-detail');
    Router.back();

    const sample = TAROT_CARDS[21];
    Router.go('detail'); renderDetail(sample.id);
    if (!document.querySelector('#view-detail #note-input') || !document.getElementById('learn-up') || !document.getElementById('learn-rev')) fail('ui-detail'); else pass('ui-detail');

    Router.go('me'); renderMe();
    if (!document.getElementById('me-export') || !document.getElementById('me-import') || !document.getElementById('me-backup-now') || !document.getElementById('me-backup-list') || !document.getElementById('me-check-update')) fail('ui-me'); else pass('ui-me');
  } catch (e) { fail('ui-exception', e.message); }

  // 4) 交互冒烟（弹层按钮绑定 / 重新抽取 / 备注编辑保存）
  try {
    const orig = {
      notes: storeGet(STORE_KEYS.notes, {}),
      learned: storeGet(STORE_KEYS.learned, []),
      today: storeGet(STORE_KEYS.today, null)
    };

    // 重新抽取：点按钮 → 弹层 → 确认 → 回到抽牌态
    TodayStore.set(TAROT_CARDS[5].id, 'upright');
    renderHome();
    const redrawBtn = document.getElementById('btn-redraw');
    if (!redrawBtn) fail('redraw-btn');
    else {
      redrawBtn.click();
      const sheet = document.querySelector('#modal-root .modal');
      const confirmBtn = sheet && Array.prototype.find.call(sheet.querySelectorAll('button'), function (b) { return b.textContent.indexOf('重新抽取') >= 0; });
      if (!sheet || !confirmBtn) fail('redraw-sheet');
      else {
        confirmBtn.click();
        if (!document.getElementById('today-card')) fail('redraw-render');
        else if (TodayStore.get()) fail('redraw-cleared');
        else pass('redraw-flow');
      }
    }
    TodayStore.clear();

    // 备注：轻点条目 → 编辑弹层 → 保存生效
    Router.go('detail'); renderDetail(TAROT_CARDS[0].id);
    NotesStore.add(TAROT_CARDS[0].id, '弹层测试');
    renderNotes(TAROT_CARDS[0].id, document.querySelector('#view-detail #notes-list'));
    const noteItem = document.querySelector('#view-detail #notes-list .note-item');
    if (!noteItem) fail('note-item');
    else {
      noteItem.click();
      const editInput = document.getElementById('edit-note-input');
      if (!editInput) fail('note-edit-sheet');
      else {
        editInput.value = '弹层已保存';
        const saveBtn = Array.prototype.find.call(document.querySelectorAll('#modal-root .modal button'), function (b) { return b.textContent.indexOf('保存') >= 0; });
        if (!saveBtn) fail('note-save-btn');
        else {
          saveBtn.click();
          if (NotesStore.forCard(TAROT_CARDS[0].id)[0].text !== '弹层已保存') fail('note-save-apply');
          else pass('note-edit-sheet');
        }
      }
    }
    NotesStore.forCard(TAROT_CARDS[0].id).forEach(function (n) { NotesStore.remove(TAROT_CARDS[0].id, n.ts); });

    // 抽牌记录：按类型分组渲染 + 次数
    const origHistory2 = storeGet(STORE_KEYS.history, []);
    localStorage.removeItem(STORE_KEYS.history);
    HistoryStore.add(TAROT_CARDS[0].id, 'upright');
    HistoryStore.add(TAROT_CARDS[0].id, 'reversed');
    renderHome();
    const histRow = document.querySelector('#view-home #draw-history .card-row');
    if (!histRow) fail('draw-history-row');
    else if (histRow.innerHTML.indexOf('正位 1 次 · 逆位 1 次') < 0 || histRow.innerHTML.indexOf('2 次') < 0) fail('draw-history-count');
    else pass('draw-history-flow');
    storeSet(STORE_KEYS.history, origHistory2);

    storeSet(STORE_KEYS.notes, orig.notes);
    storeSet(STORE_KEYS.learned, orig.learned);
    if (orig.today) storeSet(STORE_KEYS.today, orig.today); else localStorage.removeItem(STORE_KEYS.today);
  } catch (e) { fail('interaction-exception', e.message); }

  // 4.5) 备份（浏览器预览降级：localStorage 只留 2 份，可恢复）
  try {
    const origB = storeGet(STORE_KEYS.backups, []);
    localStorage.removeItem(STORE_KEYS.backups);
    Backups.save(function () {});
    Backups.save(function () {});
    Backups.save(function () {});
    const list = storeGet(STORE_KEYS.backups, []);
    if (list.length !== 2) fail('backup-keep2', 'expected 2, got ' + list.length); else pass('backup-keep2');
    let restored = null;
    Backups.restore(list[1].name, function (err, content) {
      if (!err && content) { try { const d = JSON.parse(content); if (d.app === APP_INFO.name) restored = true; } catch (e) {} }
    });
    if (!restored) fail('backup-restore'); else pass('backup-restore');
    storeSet(STORE_KEYS.backups, origB);
  } catch (e) { fail('backup-exception', e.message); }

  const fails = results.filter(function (r) { return r.indexOf('FAIL') === 0; });
  const div = document.createElement('div');
  div.id = 'selftest';
  div.setAttribute('data-result', fails.length ? 'FAIL' : 'PASS');
  div.setAttribute('data-count', String(results.length));
  div.textContent = fails.length ? fails.join(' | ') : results.join(' | ');
  document.body.appendChild(div);
}


