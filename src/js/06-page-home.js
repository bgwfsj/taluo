// ===== 今日之牌 =====
function weekdayCN() {
  const w = ['日', '一', '二', '三', '四', '五', '六'];
  return '星期' + w[new Date().getDay()];
}

function renderHeader() {
  const d = new Date();
  const header = document.getElementById('app-header');
  header.innerHTML =
    '<div class="brand">塔罗<span class="dot">✦</span>之语</div>' +
    '<div class="date">' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + weekdayCN() + '</div>';
}

function renderHome() {
  renderHeader();
  const view = document.getElementById('view-home');
  const today = TodayStore.get();
  if (TodayStore.isToday() && today) {
    const card = getCard(today.cardId);
    view.innerHTML =
      '<section class="hero"><div class="kicker">今日 · 一抽</div><h2>今日之牌</h2><p class="sub">今日指引已抽取，愿你从容度过这一天</p></section>' +
      '<div class="result-block" id="today-result">' + todayResultHTML(card, today.orientation, false) + '</div>' +
      '<div id="draw-history"></div>';
    bindResultActions(view, card, today.orientation);
    bindNotes(card.id, view.querySelector('#notes-panel'));
  } else {
    view.innerHTML = homeShellHTML();
    const cardEl = view.querySelector('.tarot-card');
    cardEl.addEventListener('click', drawToday);
  }
  renderDrawHistory();
}

function homeShellHTML() {
  return (
    '<section class="hero"><div class="kicker">今日 · 一抽</div><h2>今日之牌</h2><p class="sub">轻触牌背，今日的指引已在风里</p></section>' +
    '<div class="draw-zone"><div class="draw-card-wrap">' + tarotCardHTML(null, { id: 'today-card' }) + '</div>' +
    '<div class="draw-hint"><span class="pulse"></span><span>抽一张牌 · 听风说话</span></div></div>' +
    '<div class="result-block" id="today-result"></div>' +
    '<div id="draw-history"></div>'
  );
}

function drawToday() {
  const card = randomCard();
  const orientation = Math.random() < 0.5 ? 'upright' : 'reversed';
  TodayStore.set(card.id, orientation);
  HistoryStore.add(card.id, orientation);
  renderHome();
  toast('今日之牌已抽取');
}

function todayResultHTML(card, orientation, animate) {
  if (!card) return '<div class="empty-tip">牌义数据缺失</div>';
  const today = todayReadingFor(card, orientation);
  const dims = DIMENSIONS.map(function (d) {
    const txt = today[d.key] || '';
    return '<div class="dim-item"><div class="dim-head"><span class="em">' + d.em + '</span>' + d.label + '</div><div class="dim-body">' + esc(txt) + '</div></div>';
  }).join('');
  const badgeCls = orientation === 'reversed' ? 'reversed' : 'upright';
  return (
    '<div class="panel" style="text-align:center;">' +
      '<div class="draw-card-wrap" style="width:190px;margin:0 auto 14px;">' + tarotCardHTML(card, { flipped: true, reversed: orientation === 'reversed' }) + '</div>' +
      '<div><span class="orientation-badge ' + badgeCls + '">' + orientationLabel(orientation) + '</span></div>' +
      '<div class="result-title"><div class="cn">' + card.name + '</div><div class="en">' + card.nameEn + '</div></div>' +
      '<p class="summary-text">' + esc(card[orientation].summary) + '</p>' +
    '</div>' +
    '<div class="panel"><div class="panel-title">✨ 关键词</div><div class="chip-row">' +
      card[orientation].keywords.map(function (k) { return '<span class="chip">' + esc(k) + '</span>'; }).join('') +
    '</div></div>' +
    '<div class="section-title">今日六维解读</div>' +
    '<div class="dim-grid">' + dims + '</div>' +
    '<div class="panel" id="notes-panel"><div class="panel-title">📝 备注</div>' +
      '<div class="notes-tip">轻点可编辑 · 左滑可删除 · 与图鉴牌义互通</div>' +
      notesFormHTML(card.id) + '<div id="notes-list"></div></div>' +
    '<div class="re-draw"><button id="btn-redraw">重新抽取</button></div>' +
    '<div style="margin-top:14px;"><button id="btn-detail" class="btn btn-primary btn-block">查看完整牌义</button></div>'
  );
}

function bindResultActions(view, card, orientation) {
  const detailBtn = view.querySelector('#btn-detail');
  if (detailBtn) detailBtn.addEventListener('click', function () { Router.push('detail', card.id); });
  const redraw = view.querySelector('#btn-redraw');
  if (redraw) redraw.addEventListener('click', function () {
    openModal('重新抽取今日之牌？', '<p style="color:var(--ink-2);font-size:.9rem;">将覆盖今天已抽到的牌，确定要重新抽取吗？</p>',
      [modalBtn('取消', 'btn-ghost', closeModal),
       modalBtn('重新抽取', 'btn-primary', function () {
         closeModal();
         TodayStore.clear();
         renderHome();
         const cardEl = document.getElementById('today-card');
         if (cardEl) setTimeout(function () { cardEl.click(); }, 60);
       })]);
  });
}

// ===== 抽牌记录（今日页的「小图鉴」）=====
const drawHistoryCollapsed = {};
GROUPS.forEach(function (g) { drawHistoryCollapsed[g.key] = true; });

function renderDrawHistory() {
  const wrap = document.getElementById('draw-history');
  if (!wrap) return;
  const counts = HistoryStore.counts();
  const drawnIds = Object.keys(counts);
  if (!drawnIds.length) {
    wrap.innerHTML = '<div class="panel draw-history-panel"><div class="panel-title">🕰️ 抽牌记录</div>' +
      '<p class="muted small" style="padding:4px 0;">还没有抽牌记录，从今天的第一抽开始吧。</p></div>';
    return;
  }
  let html = '<div class="panel draw-history-panel"><div class="panel-title">🕰️ 抽牌记录<span class="sub-tip">抽到的每日之牌与次数</span></div>';
  GROUPS.forEach(function (g) {
    const cards = cardsByGroup(g.key).filter(function (c) { return counts[c.id]; });
    if (!cards.length) return;
    const totalDraws = cards.reduce(function (s, c) { return s + counts[c.id].total; }, 0);
    const collapsed = drawHistoryCollapsed[g.key];
    html +=
      '<div class="group" data-group="' + g.key + '">' +
        '<div class="group-title' + (collapsed ? ' collapsed' : '') + '">' +
          '<span class="group-label">' + g.label + '</span>' +
          '<span class="count">' + cards.length + ' 张 · 共 ' + totalDraws + ' 次</span>' +
          '<span class="chev"></span>' +
        '</div>' +
        '<div class="group-body' + (collapsed ? ' collapsed' : '') + '">' + cards.map(function (c) { return drawHistoryRowHTML(c, counts[c.id]); }).join('') + '</div>' +
      '</div>';
  });
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelectorAll('.group-title').forEach(function (title) {
    title.addEventListener('click', function () {
      const key = title.closest('.group').dataset.group;
      drawHistoryCollapsed[key] = !drawHistoryCollapsed[key];
      renderDrawHistory();
    });
  });
  wrap.querySelectorAll('.card-row').forEach(function (row) {
    row.addEventListener('click', function () { Router.push('detail', row.dataset.id); });
  });
}

function drawHistoryRowHTML(card, count) {
  return (
    '<div class="card-row" data-id="' + card.id + '">' +
      miniCardHTML(card) +
      '<div class="row-info">' +
        '<div class="row-name">' + card.name + '</div>' +
        '<div class="row-en">' + card.nameEn + '</div>' +
        '<div class="row-kw">正位 ' + count.upright + ' 次 · 逆位 ' + count.reversed + ' 次</div>' +
      '</div>' +
      '<span class="draw-count">' + count.total + ' 次</span>' +
    '</div>'
  );
}
