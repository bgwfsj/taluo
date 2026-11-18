// ===== 原生桥（WebView 壳）与备份/更新 =====
const NativeBridge = {
  ok: typeof window.AppNative !== 'undefined' && !!window.AppNative,
  cbSeq: 0,
  call(method, args, cb) {
    if (!this.ok || typeof window.AppNative[method] !== 'function') {
      if (cb) cb({ ok: false, error: 'native-unavailable' });
      return;
    }
    const cbId = 'cb' + (++this.cbSeq);
    window['__bridgeCb' + cbId] = cb || function () {};
    try {
      window.AppNative[method].apply(window.AppNative, (args || []).concat(cbId));
    } catch (e) {
      delete window['__bridgeCb' + cbId];
      if (cb) cb({ ok: false, error: String(e) });
    }
  },
  onResult(cbId, payload) {
    const fn = window['__bridgeCb' + cbId];
    if (!fn) return;
    delete window['__bridgeCb' + cbId];
    try { fn(payload); } catch (e) { console.warn('bridge cb', e); }
  }
};
window.onBridgeResult = function (cbId, payload) { NativeBridge.onResult(cbId, payload); };

function buildBackupData() {
  return {
    app: APP_INFO.name,
    version: APP_INFO.version,
    exportedAt: new Date().toISOString(),
    notes: storeGet(STORE_KEYS.notes, {}),
    learned: storeGet(STORE_KEYS.learned, []),
    today: storeGet(STORE_KEYS.today, null)
  };
}
function backupStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}
function backupMeta(b) {
  return { name: b.name, date: b.date, size: b.size };
}

// 存档备份：原生优先（文件存两份），浏览器预览降级到 localStorage（同样只留两份）
const Backups = {
  save(cb) {
    const json = JSON.stringify(buildBackupData());
    if (NativeBridge.ok) {
      NativeBridge.call('backupSave', [json], function (r) {
        if (r && r.ok) cb && cb(null, (r.backups || []).map(backupMeta));
        else cb && cb((r && r.error) || 'native-backup-failed');
      });
      return;
    }
    const backups = storeGet(STORE_KEYS.backups, []);
    backups.unshift({ name: '塔罗备份-' + backupStamp() + '.json', date: Date.now(), size: json.length, data: json });
    while (backups.length > 2) backups.pop();
    storeSet(STORE_KEYS.backups, backups);
    cb && cb(null, backups.map(backupMeta));
  },
  list(cb) {
    if (NativeBridge.ok) {
      NativeBridge.call('backupList', [], function (r) {
        if (r && r.ok) cb && cb(null, (r.backups || []).map(backupMeta));
        else cb && cb((r && r.error) || 'native-backup-list-failed');
      });
      return;
    }
    cb && cb(null, storeGet(STORE_KEYS.backups, []).map(backupMeta));
  },
  restore(name, cb) {
    if (NativeBridge.ok) {
      NativeBridge.call('backupRestore', [name], function (r) {
        if (r && r.ok && r.content) cb && cb(null, r.content);
        else cb && cb((r && r.error) || 'native-backup-restore-failed');
      });
      return;
    }
    const b = storeGet(STORE_KEYS.backups, []).find(x => x.name === name);
    cb && cb(b ? null : 'backup-not-found', b ? b.data : null);
  },
  remove(name, cb) {
    if (NativeBridge.ok) {
      NativeBridge.call('backupDelete', [name], function (r) {
        if (r && r.ok) cb && cb(null, (r.backups || []).map(backupMeta));
        else cb && cb((r && r.error) || 'native-backup-delete-failed');
      });
      return;
    }
    const backups = storeGet(STORE_KEYS.backups, []).filter(x => x.name !== name);
    storeSet(STORE_KEYS.backups, backups);
    cb && cb(null, backups.map(backupMeta));
  }
};

// 在线更新：仅打包后（原生桥可用）自动检测；浏览器预览提示
function checkForUpdate(manual) {
  if (!NativeBridge.ok) {
    if (manual) toast('当前是网页预览，打包成 App 后会自动检测更新');
    return;
  }
  NativeBridge.call('checkUpdate', [], function (r) {
    if (!r || !r.ok) { if (manual) toast((r && r.error) || '检查更新失败'); return; }
    if (!r.hasUpdate) { if (manual) toast('已是最新版本 v' + APP_INFO.version); return; }
    showUpdateSheet(r);
  });
}

function showUpdateSheet(r) {
  openModal('发现新版本 v' + r.version,
    '<p style="color:var(--ink-2);font-size:.9rem;line-height:1.7;white-space:pre-wrap;">' + esc((r.notes || '更新内容见发布说明')) + '</p>' +
    '<p class="muted small" style="margin-top:8px;">更新前会自动备份存档（仅保留最近 2 份）</p>',
    [modalBtn('稍后', 'btn-ghost', closeModal),
     modalBtn('立即更新', 'btn-primary', function () { closeModal(); startUpdate(r); })]);
}

function startUpdate(r) {
  toast('正在备份存档…');
  Backups.save(function (err) {
    if (err) { toast('备份失败，已取消更新'); return; }
    NativeBridge.call('startUpdate', [r.url || '', r.sha256 || ''], function (res) {
      if (res && res.ok) toast('已开始下载更新');
      else toast((res && res.error) || '更新启动失败');
    });
  });
}
