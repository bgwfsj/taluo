// ===== 轻量路由 =====
const Router = {
  current: 'home',
  param: null,
  stack: [],
  tabs: ['home', 'glossary', 'me'],
  go(name, param) {
    this.current = name;
    this.param = param || null;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + name);
    if (el) el.classList.add('active');
    const header = document.getElementById('app-header');
    if (name === 'detail') header.classList.add('hidden');
    else header.classList.remove('hidden');
    this.syncTabbar();
    window.scrollTo(0, 0);
  },
  push(name, param) {
    this.stack.push({ name: this.current, param: this.param });
    this.go(name, param);
  },
  back() {
    if (!this.stack.length) { renderHome(); this.go('home'); return; }
    const prev = this.stack.pop();
    if (prev.name === 'glossary') renderGlossary();
    else if (prev.name === 'me') renderMe();
    else if (prev.name === 'home') renderHome();
    this.go(prev.name, prev.param);
  },
  syncTabbar() {
    const tabs = document.querySelectorAll('#tabbar button');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.view === this.current));
  }
};

function tabbarHTML() {
  const items = [
    { view: 'home', icon: ICONS.home, label: '今日' },
    { view: 'glossary', icon: ICONS.book, label: '图鉴' },
    { view: 'me', icon: ICONS.me, label: '我的' }
  ];
  return items.map(it =>
    '<button data-view="' + it.view + '"><span class="ico">' + it.icon + '</span>' + it.label + '</button>'
  ).join('');
}
