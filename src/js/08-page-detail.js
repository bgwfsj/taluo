// ===== 牌义详情 + 备注 =====
let detailCardId = null;
let detailVisRev = false;

function renderDetail(cardId) {
  const card = getCard(cardId);
  if (!card) { Router.back(); return; }
  detailCardId = cardId;
  detailVisRev = false;
  const view = document.getElementById('view-detail');
  const suitInfo = card.arcana === 'major'
    ? '大阿卡纳 · 第 ' + card.number + ' 号'
    : SUITS[card.suit].label + ' · ' + SUITS[card.suit].element;
  view.innerHTML =
    '<div class="page-head"><button class="back" id="detail-back">' + ICONS.back + '</button>' +
      '<h1>' + card.name + '</h1><span class="muted small" style="flex:none;">' + card.nameEn + '</span></div>' +
    '<div class="detail-card-wrap" id="detail-card-wrap">' + tarotCardHTML(card, { flipped: true, reversed: detailVisRev }) + '</div>' +
    '<p class="orient-tip" id="orient-tip">轻触牌面切换正逆位</p>' +
    '<div class="learn-orients">' +
      '<button class="learn-toggle up' + (LearnedStore.has(card.id, 'upright') ? ' done' : '') + '" id="learn-up">' +
        '<span class="ls">正位</span><span class="ls-star">' + (LearnedStore.has(card.id, 'upright') ? '★' : '☆') + '</span></button>' +
      '<button class="learn-toggle rev' + (LearnedStore.has(card.id, 'reversed') ? ' done' : '') + '" id="learn-rev">' +
        '<span class="ls">逆位</span><span class="ls-star">' + (LearnedStore.has(card.id, 'reversed') ? '★' : '☆') + '</span></button>' +
    '</div>' +
    orientBlockHTML(card, 'upright') +
    orientBlockHTML(card, 'reversed') +
    '<div class="panel"><div class="panel-title">🖼️ 牌面描述</div><p style="font-size:.88rem;color:var(--ink-2);">' + esc(card.desc) + '</p></div>' +
    '<div class="panel" id="notes-panel"><div class="panel-title">📝 备注</div>' +
      '<div class="notes-tip">轻点可编辑 · 左滑可删除</div>' +
      notesFormHTML(card.id) + '<div id="notes-list"></div></div>';

  // 返回
  view.querySelector('#detail-back').addEventListener('click', function () { Router.back(); });
  // 牌面翻转（正/逆位视觉切换）
  view.querySelector('#detail-card-wrap').addEventListener('click', function () {
    detailVisRev = !detailVisRev;
    view.querySelector('#detail-card-wrap').innerHTML = tarotCardHTML(card, { flipped: true, reversed: detailVisRev });
  });
  // 已学习（正位 / 逆位分开）
  view.querySelector('#learn-up').addEventListener('click', function () { toggleLearn(card.id, 'upright', view); });
  view.querySelector('#learn-rev').addEventListener('click', function () { toggleLearn(card.id, 'reversed', view); });
  bindNotes(card.id, view.querySelector('#notes-panel'));
}

function toggleLearn(cardId, orient, view) {
  const done = LearnedStore.toggle(cardId, orient);
  const btn = view.querySelector(orient === 'reversed' ? '#learn-rev' : '#learn-up');
  btn.classList.toggle('done', done);
  btn.querySelector('.ls-star').textContent = done ? '★' : '☆';
  toast(orientationLabel(orient) + (done ? ' 已标记学习 ✓' : ' 已取消学习标记'));
}

function orientBlockHTML(card, orientation) {
  const o = card[orientation];
  const cls = orientation === 'reversed' ? 'reversed' : 'upright';
  return (
    '<div class="panel"><div class="orient-block" style="margin:0;">' +
      '<div class="orient-head"><span class="dot ' + cls + '"></span>' + orientationLabel(orientation) + '含义</div>' +
      '<p class="orient-summary">' + esc(o.summary) + '</p>' +
      '<div class="chip-row">' + o.keywords.map(function (k) { return '<span class="chip">' + esc(k) + '</span>'; }).join('') + '</div>' +
    '</div></div>'
  );
}

// ===== 备注 =====
function notesFormHTML(cardId) {
  return (
    '<textarea id="note-input" maxlength="' + NOTE_LIMIT + '" placeholder="写点你的理解、联想或心得（每条最多 ' + NOTE_LIMIT + ' 字，可添加多条）" style="min-height:80px;"></textarea>' +
    '<div class="char-count"><span id="note-count">0</span> / ' + NOTE_LIMIT + '</div>' +
    '<button class="btn btn-primary btn-block" id="note-add" style="margin-top:8px;">添加备注</button>'
  );
}

function bindNotes(cardId, panel) {
  const input = panel.querySelector('#note-input');
  const count = panel.querySelector('#note-count');
  const addBtn = panel.querySelector('#note-add');
  if (!input) return;
  const syncCount = function () { count.textContent = String(input.value.length); };
  input.addEventListener('input', syncCount);
  addBtn.addEventListener('click', function () {
    const text = input.value.trim();
    if (!text) { toast('备注内容不能为空'); return; }
    if (text.length > NOTE_LIMIT) { toast('每条备注最多 ' + NOTE_LIMIT + ' 字'); return; }
    NotesStore.add(cardId, text);
    input.value = '';
    syncCount();
    renderNotes(cardId, panel.querySelector('#notes-list'));
    toast('备注已添加');
  });
  renderNotes(cardId, panel.querySelector('#notes-list'));
}

function renderNotes(cardId, list) {
  if (!list) return;
  const notes = NotesStore.forCard(cardId);
  if (!notes.length) {
    list.innerHTML = '<p class="muted small" style="padding:6px 0;">还没有备注，从第一条开始吧。</p>';
    return;
  }
  list.innerHTML = notes.map(function (n) {
    return (
      '<div class="note-item" data-ts="' + n.ts + '">' +
        '<div class="note-text">' + esc(n.text) + '</div>' +
        '<div class="note-meta"><span>' + fmtDate(n.ts) + '</span></div>' +
      '</div>'
    );
  }).join('');
  list.querySelectorAll('.note-item').forEach(function (item) {
    bindNoteItem(cardId, item, list);
  });
}

function bindNoteItem(cardId, item, list) {
  let suppressClick = false;
  let startX = null, startY = null, curX = null;
  item.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; curX = startX;
  }, { passive: true });
  item.addEventListener('touchmove', function (e) {
    curX = e.touches[0].clientX;
    const dx = curX - startX;
    if (dx < 0 && Math.abs(dx) > Math.abs(e.touches[0].clientY - startY)) {
      item.style.transform = 'translateX(' + Math.max(dx, -70) + 'px)';
      item.classList.add('swiping');
    }
  }, { passive: true });
  item.addEventListener('touchend', function () {
    const dx = curX - startX;
    item.style.transform = '';
    item.style.transition = 'transform .18s ease';
    item.classList.remove('swiping');
    setTimeout(function () { item.style.transition = ''; }, 200);
    if (dx < -64) {
      suppressClick = true;
      deleteNote(cardId, Number(item.dataset.ts), list);
      setTimeout(function () { suppressClick = false; }, 400);
    }
  });
  item.addEventListener('click', function () {
    if (suppressClick) return;
    editNote(cardId, Number(item.dataset.ts), list);
  });
}

function deleteNote(cardId, ts, list) {
  openModal('删除这条备注？', '<p style="color:var(--ink-2);font-size:.9rem;">删除后不可恢复。</p>',
    [modalBtn('取消', 'btn-ghost', closeModal),
     modalBtn('删除', 'btn-danger', function () {
       closeModal();
       NotesStore.remove(cardId, ts);
       renderNotes(cardId, list);
       toast('备注已删除');
     })]);
}

function editNote(cardId, ts, list) {
  const note = NotesStore.forCard(cardId).find(function (n) { return n.ts === ts; });
  if (!note) return;
  openModal('编辑备注',
    '<textarea id="edit-note-input" maxlength="' + NOTE_LIMIT + '" style="min-height:90px;">' + esc(note.text) + '</textarea>' +
    '<div class="char-count"><span id="edit-note-count">' + note.text.length + '</span> / ' + NOTE_LIMIT + '</div>',
    [modalBtn('取消', 'btn-ghost', closeModal),
     modalBtn('保存', 'btn-primary', function () {
       const input = document.getElementById('edit-note-input');
       const text = input.value.trim();
       if (!text) { toast('备注内容不能为空'); return; }
       if (text.length > NOTE_LIMIT) { toast('每条备注最多 ' + NOTE_LIMIT + ' 字'); return; }
       NotesStore.update(cardId, ts, text);
       closeModal();
       renderNotes(cardId, list);
       toast('备注已更新');
     })]);
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-ghost btn-block';
  delBtn.style.marginTop = '10px';
  delBtn.textContent = '删除此条备注';
  delBtn.addEventListener('click', function () {
    closeModal();
    deleteNote(cardId, ts, list);
  });
  const sheet = document.querySelector('#modal-root .modal');
  if (sheet) sheet.appendChild(delBtn);
  const input = document.getElementById('edit-note-input');
  const count = document.getElementById('edit-note-count');
  input.addEventListener('input', function () { count.textContent = String(input.value.length); });
  input.focus();
}
