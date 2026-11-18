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
      '<div class="result-block" id="today-result">' + todayResultHTML(card, today.orientation, false) + '</div>';
    bindResultActions(view, card, today.orientation);
  } else {
    view.innerHTML = homeShellHTML();
    const cardEl = view.querySelector('.tarot-card');
    cardEl.addEventListener('click', drawToday);
  }
}

function homeShellHTML() {
  return (
    '<section class="hero"><div class="kicker">今日 · 一抽</div><h2>今日之牌</h2><p class="sub">轻触牌背，今日的指引已在风里</p></section>' +
    '<div class="draw-zone"><div class="draw-card-wrap">' + tarotCardHTML(null, { id: 'today-card' }) + '</div>' +
    '<div class="draw-hint"><span class="pulse"></span><span>抽一张牌 · 听风说话</span></div></div>' +
    '<div class="result-block" id="today-result"></div>'
  );
}

function drawToday() {
  const card = randomCard();
  const orientation = Math.random() < 0.5 ? 'upright' : 'reversed';
  TodayStore.set(card.id, orientation);
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
