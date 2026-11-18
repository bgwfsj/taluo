// ===== 启动 =====
function boot() {
  const tabbar = document.getElementById('tabbar');
  tabbar.innerHTML = tabbarHTML();
  tabbar.querySelectorAll('button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const view = btn.dataset.view;
      if (view === 'glossary') renderGlossary();
      else if (view === 'me') renderMe();
      else renderHome();
      Router.go(view);
    });
  });
  renderHome();
  Router.go('home');
  // 供 WebView 壳的系统返回键调用
  window.taOnBack = function () { Router.back(); };

  // 功能页左右滑动切换（首尾相连）
  let swipeStartX = null, swipeStartY = null;
  document.addEventListener('touchstart', function (e) {
    if (e.target.closest('.modal-mask, .modal, #tabbar, textarea, input, .note-item')) return;
    if (Router.current === 'detail') return;
    swipeStartX = e.touches[0].clientX; swipeStartY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (swipeStartX == null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;
    swipeStartX = null; swipeStartY = null;
    if (Math.abs(dx) < 56 || Math.abs(dy) > Math.abs(dx) * 1.4) return;
    const tabs = Router.tabs;
    const idx = tabs.indexOf(Router.current);
    const next = dx < 0 ? tabs[(idx + 1) % tabs.length] : tabs[(idx - 1 + tabs.length) % tabs.length];
    if (next === 'glossary') renderGlossary();
    else if (next === 'me') renderMe();
    else renderHome();
    Router.go(next);
  }, { passive: true });

  // 预览/截图钩子：?page=glossary | ?page=detail&card=m00 | ?page=me
  try {
    const params = new URLSearchParams(location.search);
    const page = params.get('page');
    const cardId = params.get('card');
    if (page === 'glossary') { renderGlossary(); Router.go('glossary'); }
    else if (page === 'detail' && cardId && getCard(cardId)) { renderDetail(cardId); Router.go('detail'); }
    else if (page === 'me') { renderMe(); Router.go('me'); }
    else if (page === 'today') {
      const t = TodayStore.isToday() ? TodayStore.get() : null;
      const card = t ? getCard(t.cardId) : randomCard();
      const orientation = t ? t.orientation : (Math.random() < 0.5 ? 'upright' : 'reversed');
      if (!t) TodayStore.set(card.id, orientation);
      renderHome();
      Router.go('home');
    }
  } catch (e) { console.warn('preview hook', e); }

  // 打包后自动检测更新
  if (NativeBridge.ok) setTimeout(function () { checkForUpdate(false); }, 800);

  if (location.search.indexOf('selftest') >= 0) setTimeout(runSelfTest, 150);
  if (location.search.indexOf('qa') >= 0) setTimeout(runQA, 200);

function runQA() {
  const out = {
    innerWidth: window.innerWidth,
    scrollWidth: document.body.scrollWidth,
    hasOverflowX: document.body.scrollWidth > window.innerWidth,
    activeView: Router.current,
    tabbarButtons: document.querySelectorAll('#tabbar button').length,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    appMaxWidth: getComputedStyle(document.getElementById('app')).maxWidth,
    cardCount: document.querySelectorAll('.tarot-card').length,
    cardRowCount: document.querySelectorAll('.card-row').length,
    dimItemCount: document.querySelectorAll('.dim-item').length,
    noteInput: !!document.getElementById('note-input'),
    cardBackBg: (function(){ var el=document.querySelector('.card-back'); return el ? getComputedStyle(el).backgroundImage.slice(0,40) : null; })(),
    badgeBg: (function(){ var el=document.querySelector('.orientation-badge'); return el ? getComputedStyle(el).backgroundColor : null; })(),
    firstDimLabel: (function(){ var el=document.querySelector('.dim-item .dim-head'); return el ? el.textContent.trim() : null; })(),
    firstRowName: (function(){ var el=document.querySelector('.card-row .row-name'); return el ? el.textContent : null; })(),
    learnLabel: (function(){ var el=document.getElementById('learn-label'); return el ? el.textContent : null; })(),
    noteLimitAttr: (function(){ var el=document.getElementById('note-input'); return el ? el.getAttribute('maxlength') : null; })(),
    drawCardRect: (function(){ var el=document.getElementById('today-card'); if(!el) return null; var r=el.getBoundingClientRect(); return Math.round(r.left)+','+Math.round(r.top)+','+Math.round(r.width)+'x'+Math.round(r.height); })()
  };
  const div = document.createElement('div');
  div.id = 'qa';
  div.textContent = JSON.stringify(out);
  document.body.appendChild(div);
}
}
document.addEventListener('DOMContentLoaded', boot);
