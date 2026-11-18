// ===== 我的 =====
function renderMe() {
  renderHeader();
  const view = document.getElementById('view-me');
  const learned = LearnedStore.count();
  const pct = Math.round(learned / TAROT_CARDS.length * 100);
  const learnedList = LearnedStore.list().map(getCard).filter(Boolean);
  view.innerHTML =
    '<div class="panel"><div class="panel-title">📚 学习进度</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:.84rem;color:var(--ink-2);margin-bottom:8px;">' +
        '<span>已学习 ' + learned + ' / ' + TAROT_CARDS.length + ' 张</span><span>' + pct + '%</span></div>' +
      '<div class="progress"><div style="width:' + pct + '%"></div></div>' +
      (learnedList.length
        ? '<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;">' +
          learnedList.map(function (c) {
            return '<span class="chip" style="cursor:pointer;" data-learned="' + c.id + '">' + c.name + '</span>';
          }).join('') + '</div>'
        : '<p class="muted small" style="margin-top:10px;">在「图鉴」里把学过的牌标记起来吧。</p>') +
    '</div>' +
    '<div class="panel"><div class="panel-title">🗂️ 数据管理</div>' +
      '<button class="me-row" id="me-export"><span class="ico">📤</span><span class="txt">导出备份<span class="sub">把备注、学习标记、今日之牌存为 JSON 文件</span></span><span class="arrow">›</span></button>' +
      '<button class="me-row" id="me-import"><span class="ico">📥</span><span class="txt">导入备份<span class="sub">从备份文件恢复数据（会覆盖当前数据）</span></span><span class="arrow">›</span></button>' +
      '<button class="me-row" id="me-reset"><span class="ico">🧹</span><span class="txt">重置全部数据<span class="sub">清空备注、学习标记与今日之牌</span></span><span class="arrow">›</span></button>' +
    '</div>' +
    '<div class="panel"><div class="panel-title">ℹ️ 关于</div>' +
      '<div class="me-row" style="cursor:default;"><span class="ico">🔮</span><span class="txt">' + APP_INFO.name + '<span class="sub">清爽简约 · 离线可用 · 数据只存本地</span></span><span style="color:var(--ink-3);font-size:.82rem;">v' + APP_INFO.version + '</span></div>' +
      '<div id="me-changelog"></div>' +
    '</div>' +
    '<p class="version-line">塔罗之语 v' + APP_INFO.version + ' · 所有牌义仅供自我探索与娱乐参考</p>';
  view.querySelectorAll('[data-learned]').forEach(function (chip) {
    chip.addEventListener('click', function () { Router.push('detail', chip.dataset.learned); });
  });
  // 更新记录
  const log = document.getElementById('me-changelog');
  log.innerHTML = APP_INFO.changelog.map(function (c) {
    return '<p class="muted small" style="margin-top:6px;">v' + c.v + '（' + c.date + '）：' + c.items.join('；') + '</p>';
  }).join('');
  // 导出
  view.querySelector('#me-export').addEventListener('click', exportBackup);
  // 导入
  view.querySelector('#me-import').addEventListener('click', function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () { importBackup(String(reader.result)); };
      reader.readAsText(file, 'utf-8');
    });
    input.click();
  });
  // 重置
  view.querySelector('#me-reset').addEventListener('click', function () {
    openModal('重置全部数据？', '<p style="color:var(--ink-2);font-size:.9rem;">将清空所有备注、学习标记和今日之牌，且不可恢复。建议先导出备份。</p>',
      [modalBtn('取消', 'btn-ghost', closeModal),
       modalBtn('确认重置', 'btn-danger', function () {
         closeModal();
         Object.keys(STORE_KEYS).forEach(function (k) { localStorage.removeItem(STORE_KEYS[k]); });
         renderMe();
         toast('已重置全部数据');
       })]);
  });
}

function exportBackup() {
  const data = {
    app: APP_INFO.name,
    version: APP_INFO.version,
    exportedAt: new Date().toISOString(),
    notes: storeGet(STORE_KEYS.notes, {}),
    learned: storeGet(STORE_KEYS.learned, []),
    today: storeGet(STORE_KEYS.today, null)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  a.href = url;
  a.download = '塔罗备份-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  toast('备份已导出');
}

function importBackup(text) {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !('notes' in data) || !('learned' in data)) {
      toast('不是有效的备份文件');
      return;
    }
    storeSet(STORE_KEYS.notes, data.notes || {});
    storeSet(STORE_KEYS.learned, Array.isArray(data.learned) ? data.learned : []);
    if (data.today && typeof data.today === 'object') storeSet(STORE_KEYS.today, data.today);
    renderMe();
    toast('备份已导入 ✓');
  } catch (e) {
    toast('备份文件解析失败');
  }
}
