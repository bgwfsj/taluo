// ===== 牌义图鉴 =====
let glossaryKeyword = '';

function renderGlossary() {
  renderHeader();
  const view = document.getElementById('view-glossary');
  view.innerHTML =
    '<div class="search-box"><span class="mag">🔍</span><input id="glossary-search" type="text" placeholder="搜索牌名 / 英文 / 关键词" value="' + esc(glossaryKeyword) + '"></div>' +
    '<div id="glossary-groups"></div>' +
    '<div id="glossary-empty" class="empty-tip hidden">没有找到相关牌，换个关键词试试</div>';
  const input = view.querySelector('#glossary-search');
  input.addEventListener('input', function () {
    glossaryKeyword = input.value.trim();
    renderGlossaryGroups();
  });
  renderGlossaryGroups();
}

function filterCards(cards) {
  const kw = glossaryKeyword.toLowerCase();
  if (!kw) return cards;
  return cards.filter(function (c) {
    return (c.name + ' ' + c.nameEn + ' ' + c.upright.keywords.join(' ') + ' ' + c.reversed.keywords.join(' ')).toLowerCase().indexOf(kw) >= 0;
  });
}

// 分组折叠状态（默认折叠）
const glossaryCollapsed = {};
GROUPS.forEach(function (g) { glossaryCollapsed[g.key] = true; });

function renderGlossaryGroups() {
  const wrap = document.getElementById('glossary-groups');
  const empty = document.getElementById('glossary-empty');
  if (!wrap) return;
  let html = '';
  let total = 0;
  const searching = !!glossaryKeyword;
  GROUPS.forEach(function (g) {
    const cards = filterCards(cardsByGroup(g.key));
    total += cards.length;
    if (!cards.length) return;
    const collapsed = !searching && glossaryCollapsed[g.key];
    html +=
      '<div class="group" data-group="' + g.key + '">' +
        '<div class="group-title' + (collapsed ? ' collapsed' : '') + '">' +
          '<span class="group-label">' + g.label + '</span>' +
          '<span class="count">' + cards.length + '</span>' +
          '<span class="chev"></span>' +
        '</div>' +
        '<div class="group-body' + (collapsed ? ' collapsed' : '') + '">' + cards.map(cardRowHTML).join('') + '</div>' +
      '</div>';
  });
  wrap.innerHTML = html;
  empty.classList.toggle('hidden', total > 0);
  wrap.querySelectorAll('.group-title').forEach(function (title) {
    title.addEventListener('click', function () {
      const key = title.closest('.group').dataset.group;
      glossaryCollapsed[key] = !glossaryCollapsed[key];
      renderGlossaryGroups();
    });
  });
  wrap.querySelectorAll('.card-row').forEach(function (row) {
    row.addEventListener('click', function () { Router.push('detail', row.dataset.id); });
  });
  wrap.querySelectorAll('.learn-badge').forEach(function (badge) {
    badge.addEventListener('click', function (e) {
      e.stopPropagation();
      const done = LearnedStore.toggle(badge.closest('.card-row').dataset.id, badge.dataset.ol);
      toast(orientationLabel(badge.dataset.ol) + (done ? ' 已标记学习 ✓' : ' 已取消学习标记'));
      renderGlossaryGroups();
    });
  });
}

function cardRowHTML(card) {
  const l = LearnedStore.byCard(card.id);
  return (
    '<div class="card-row" data-id="' + card.id + '">' +
      miniCardHTML(card) +
      '<div class="row-info">' +
        '<div class="row-name">' + card.name + '</div>' +
        '<div class="row-en">' + card.nameEn + '</div>' +
        '<div class="row-kw">' + esc(card.upright.keywords.slice(0, 3).join(' · ')) + '</div>' +
      '</div>' +
      '<div class="row-learn">' +
        '<span class="learn-badge up' + (l.upright ? ' done' : '') + '" data-ol="upright" role="button" aria-label="正位已学习">正</span>' +
        '<span class="learn-badge rev' + (l.reversed ? ' done' : '') + '" data-ol="reversed" role="button" aria-label="逆位已学习">逆</span>' +
      '</div>' +
    '</div>'
  );
}
