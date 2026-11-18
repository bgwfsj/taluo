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

    const t0 = LearnedStore.toggle(id);
    const t1 = LearnedStore.toggle(id);
    if (t0 !== true || t1 !== false) fail('learned-toggle'); else pass('learned-toggle');

    TodayStore.set(id, 'reversed');
    const t = TodayStore.get();
    if (!t || t.cardId !== id || t.orientation !== 'reversed') fail('today-store'); else pass('today-store');
    TodayStore.clear();

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
    TodayStore.clear();

    Router.go('glossary'); renderGlossary();
    const rowCount = document.querySelectorAll('#view-glossary .card-row').length;
    if (rowCount !== 78) fail('ui-glossary-count', 'expected 78, got ' + rowCount); else pass('ui-glossary-count');

    const firstRow = document.querySelector('#view-glossary .card-row');
    firstRow.click();
    if (Router.current !== 'detail' || !document.getElementById('note-input')) fail('glossary-nav-detail');
    else pass('glossary-nav-detail');
    Router.back();

    const sample = TAROT_CARDS[21];
    Router.go('detail'); renderDetail(sample.id);
    if (!document.getElementById('note-input') || !document.getElementById('learn-toggle')) fail('ui-detail'); else pass('ui-detail');

    Router.go('me'); renderMe();
    if (!document.getElementById('me-export') || !document.getElementById('me-import')) fail('ui-me'); else pass('ui-me');
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
    renderNotes(TAROT_CARDS[0].id);
    const noteItem = document.querySelector('#notes-list .note-item');
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

    storeSet(STORE_KEYS.notes, orig.notes);
    storeSet(STORE_KEYS.learned, orig.learned);
    if (orig.today) storeSet(STORE_KEYS.today, orig.today); else localStorage.removeItem(STORE_KEYS.today);
  } catch (e) { fail('interaction-exception', e.message); }

  const fails = results.filter(function (r) { return r.indexOf('FAIL') === 0; });
  const div = document.createElement('div');
  div.id = 'selftest';
  div.setAttribute('data-result', fails.length ? 'FAIL' : 'PASS');
  div.setAttribute('data-count', String(results.length));
  div.textContent = fails.length ? fails.join(' | ') : results.join(' | ');
  document.body.appendChild(div);
}
