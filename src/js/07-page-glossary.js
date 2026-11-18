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

function renderGlossaryGroups() {
  const wrap = document.getElementById('glossary-groups');
  const empty = document.getElementById('glossary-empty');
  if (!wrap) return;
  let html = '';
  let total = 0;
  GROUPS.forEach(function (g) {
    const cards = filterCards(cardsByGroup(g.key));
    total += cards.length;
    if (!cards.length) return;
    html +=
      '<div class="group"><div class="group-title">' + g.label + '<span class="count">' + cards.length + '</span></div>' +
      cards.map(cardRowHTML).join('') + '</div>';
  });
  wrap.innerHTML = html;
  empty.classList.toggle('hidden', total > 0);
  wrap.querySelectorAll('.card-row').forEach(function (row) {
    row.addEventListener('click', function () { Router.push('detail', row.dataset.id); });
  });
}

function cardRowHTML(card) {
  const learned = LearnedStore.has(card.id);
  return (
    '<div class="card-row" data-id="' + card.id + '">' +
      miniCardHTML(card) +
      '<div class="row-info">' +
        '<div class="row-name">' + card.name + '</div>' +
        '<div class="row-en">' + card.nameEn + '</div>' +
        '<div class="row-kw">' + esc(card.upright.keywords.slice(0, 3).join(' · ')) + '</div>' +
      '</div>' +
      '<span class="learned-badge' + (learned ? ' done' : '') + '"></span>' +
    '</div>'
  );
}
