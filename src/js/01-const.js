// ===== 常量 =====
const APP_INFO = {
  name: '塔罗之语',
  version: '0.4.2',
  changelog: [
    { v: '0.4.2', date: '2026-11-18', items: ['启动图标重做：去掉白边白底，深色渐变底 + 圣杯国王去背景放大特写'] },
    { v: '0.4.1', date: '2026-11-18', items: ['今日六维解读默认展开，去掉折叠', '「我的」关于改为默认折叠，点击展开', '启动图标改为圣杯国王上半身特写'] },
    { v: '0.4.0', date: '2026-11-18', items: ['打包安卓 App：新增在线更新（打开自动检测，更新前自动备份）','新增存档备份：本地保留最近 2 份，可恢复/删除'] },
    { v: '0.3.3', date: '2026-11-18', items: ['图鉴支持按类型折叠分组（默认折叠）'] },
    { v: '0.3.2', date: '2026-11-18', items: ['修复图鉴/结果页进入详情白屏：跳转时未渲染详情页'] },
    { v: '0.3.1', date: '2026-11-18', items: ['移除抽牌抖动/翻牌动画，点击即时呈现今日之牌'] },
    { v: '0.3.0', date: '2026-11-18', items: ['UI 改版：轻盈极简 · 绿蓝光晕 · 留白 · 底部弹层', '修复弹层按钮失效（重新抽取 / 删除 / 重置）', '备注轻点编辑 · 左滑删除', '功能页左右滑动切换', '底部一字导航：今 · 鉴 · 我'] },
    { v: '0.2.0', date: '2026-11-18', items: ['78 张牌面替换为 Rider-Waite 原版插画（公有领域）', '新增真实牌背图案', '修复翻转动画：抽牌时牌背朝上、翻开显示牌面'] },
    { v: '0.1.0', date: '2026-11-18', items: ['初版：今日之牌每日一抽', '78 张牌正逆位含义图鉴', '已学习标记与无限条备注（每条 500 字）'] }
  ]
};

const DIMENSIONS = [
  { key: 'career', label: '事业学业', em: '💼' },
  { key: 'love', label: '感情', em: '💗' },
  { key: 'wealth', label: '财运', em: '🪙' },
  { key: 'health', label: '健康', em: '🌿' },
  { key: 'social', label: '人际', em: '🤝' },
  { key: 'spirit', label: '心灵成长', em: '✨' }
];

const SUITS = {
  wands:     { label: '权杖', en: 'Wands',     em: '🪄', color: '#e08a3c', element: '火 · 行动与热情' },
  cups:      { label: '圣杯', en: 'Cups',      em: '🍷', color: '#4a8fd8', element: '水 · 情感与直觉' },
  swords:    { label: '宝剑', en: 'Swords',    em: '⚔️', color: '#7f8a9e', element: '风 · 思维与沟通' },
  pentacles: { label: '星币', en: 'Pentacles', em: '🪙', color: '#5f9e6f', element: '土 · 物质与务实' }
};

const STORE_KEYS = {
  notes: 'tarot.notes',
  learned: 'tarot.learned',
  today: 'tarot.today',
  backups: 'tarot.backups'
};

const NOTE_LIMIT = 500;

const GROUPS = [
  { key: 'major', label: '大阿卡纳' },
  { key: 'wands', label: '权杖 · 火' },
  { key: 'cups', label: '圣杯 · 水' },
  { key: 'swords', label: '宝剑 · 风' },
  { key: 'pentacles', label: '星币 · 土' }
];
