// ===== 塔罗数据聚合与牌面渲染 =====
const MAJOR_CARDS = [...MAJOR_CARDS_A, ...MAJOR_CARDS_B];
const MINOR_CARDS = [...MINOR_CARDS_WANDS, ...MINOR_CARDS_CUPS, ...MINOR_CARDS_SWORDS, ...MINOR_CARDS_PENTACLES];
const TAROT_CARDS = [...MAJOR_CARDS, ...MINOR_CARDS];

const CARD_MAP = new Map(TAROT_CARDS.map(c => [c.id, c]));
function getCard(id) { return CARD_MAP.get(id) || null; }
function randomCard() { return TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)]; }
function cardsByGroup(groupKey) {
  if (groupKey === 'major') return MAJOR_CARDS;
  return MINOR_CARDS.filter(c => c.suit === groupKey);
}

const RANK_CN = { ace: '一', two: '二', three: '三', four: '四', five: '五', six: '六', seven: '七', eight: '八', nine: '九', ten: '十', page: '侍从', knight: '骑士', queen: '皇后', king: '国王' };
const RANK_NUM = { ace: 'A', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', page: 'P', knight: 'KN', queen: 'Q', king: 'K' };
const MAJOR_ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];

function cornerNum(card) {
  if (card.arcana === 'major') return MAJOR_ROMAN[card.number];
  return RANK_NUM[card.rank] || card.number;
}

// 四花色线性 SVG 符号
function suitSVG(suit, cls) {
  const color = SUITS[suit].color;
  const stroke = 'stroke="' + color + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  let inner = '';
  if (suit === 'wands') {
    inner = '<line x1="12" y1="3" x2="12" y2="21" ' + stroke + '/>' +
            '<path d="M12 3c2.2 2.1 3.4 3.9 3.4 5.7A3.4 3.4 0 0 1 12 12.1 3.4 3.4 0 0 1 8.6 8.7C8.6 6.9 9.8 5.1 12 3z" fill="' + color + '" opacity=".85"/>';
  } else if (suit === 'cups') {
    inner = '<path d="M8.5 4h7l-1 6.2a2.5 2.5 0 0 1-5 0L8.5 4z" ' + stroke + '/>' +
            '<line x1="12" y1="12.5" x2="12" y2="17" ' + stroke + '/>' +
            '<path d="M8.5 17h7" ' + stroke + '/>';
  } else if (suit === 'swords') {
    inner = '<path d="M12 2.5 8.8 9.2 12 11l3.2-1.8z" fill="' + color + '" opacity=".9"/>' +
            '<line x1="7.4" y1="11" x2="16.6" y2="11" ' + stroke + '/>' +
            '<line x1="12" y1="11" x2="12" y2="18.5" ' + stroke + '/>' +
            '<circle cx="12" cy="20" r="1.6" ' + stroke + '/>';
  } else { // pentacles
    inner = '<circle cx="12" cy="12" r="7.6" ' + stroke + '/>' +
            '<path d="M12 6.9 14.9 16.2 7.1 10.7h9.8l-7.8 5.5z" fill="' + color + '" opacity=".9"/>';
  }
  return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>';
}

function cardFrontHTML(card, opts) {
  opts = opts || {};
  const rev = opts.reversed ? ' rev' : '';
  const num = cornerNum(card);
  const img = CARD_IMAGES[card.id];
  let art = '';
  if (img) {
    art = '<img class="card-img" src="' + img + '" alt="' + card.nameEn + '">';
  } else if (card.arcana === 'major') {
    art = '<span class="glyph">' + card.glyph + '</span>';
  } else {
    const suitColor = SUITS[card.suit].color;
    art = suitSVG(card.suit, 'suit') +
          '<span class="rank-txt" style="color:' + suitColor + '">' + RANK_CN[card.rank] + '</span>';
  }
  return '<div class="card-front' + rev + '">' +
    '<div class="corner"><span class="num">' + num + '</span><span class="num">' + num + '</span></div>' +
    '<div class="art">' + art + '</div>' +
    '<div><div class="card-name">' + card.name + '</div><div class="card-name-en">' + card.nameEn + '</div></div>' +
    '</div>';
}

function cardBackHTML() {
  return '<div class="face back"><div class="card-back"><img class="back-img" src="' + CARD_BACK_IMAGE + '" alt=""></div></div>';
}

// 完整可翻转的塔罗牌
function tarotCardHTML(card, opts) {
  opts = opts || {};
  const flipClass = opts.flipped ? ' flipped' : '';
  const front = card ? cardFrontHTML(card, opts) : '<div class="card-front"></div>';
  const wrapper = '<div class="tarot-card' + flipClass + (opts.shake ? ' shake' : '') + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' +
    '<div class="face front">' + front + '</div>' +
    cardBackHTML() + '</div>';
  return wrapper;
}

// 图鉴用的迷你牌
function miniCardHTML(card) {
  const img = CARD_IMAGES[card.id];
  if (img) {
    return '<div class="mini-card"><img class="mini-img" src="' + img + '" alt="' + card.nameEn + '"></div>';
  }
  if (card.arcana === 'major') {
    return '<div class="mini-card"><span class="glyph">' + card.glyph + '</span><span class="mini-num">' + cornerNum(card) + '</span></div>';
  }
  return '<div class="mini-card"><span class="mini-num" style="color:' + SUITS[card.suit].color + '">' + RANK_NUM[card.rank] + '</span>' + suitSVG(card.suit, 'suit') + '</div>';
}

function groupOf(card) {
  return card.arcana === 'major' ? 'major' : card.suit;
}

function orientationLabel(o) { return o === 'reversed' ? '逆位' : '正位'; }
