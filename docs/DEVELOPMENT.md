# 塔罗之语 · 开发文档

纯前端塔罗牌 App（单文件 HTML，可离线运行，后续封装安卓 WebView 壳 APK）。

## 目录结构

```
src/                 源码（只改这里，生成文件不直接编辑）
  template.html      HTML 骨架，{{CSS}} / {{JS}} 占位符
  css/               按模块拆分样式（01-base / 02-layout / 03-components / 04-pages）
  js/                按模块拆分脚本，文件名数字前缀决定合并顺序
    data/            塔罗牌数据（10-dims 模板、11-12 大阿卡纳、15 牌面图片、20-23 小阿卡纳）
tarot.html           构建产物：自包含单文件（打包时同步到 APK assets/index.html）
TarotApk/            安卓 WebView 壳工程（app/src/main/assets/index.html 为打包页面）
  app/build.gradle   versionCode / versionName、release 签名配置（signing.properties 不入库）
  app/src/main/java/com/bgwfsj/tarot/  MainActivity / Bridge / BackupStore / Updater / Notifications
  app/src/main/res/  图标（圣杯国王，mipmap-*）+ strings + FileProvider paths
_tools/
  build.js           合并 src → tarot.html，检查占位符与内联事件
  verify.ps1         一键验证：构建 + JS 语法 + 无头 Chrome 回归
  build-release.ps1  同步 assets → Gradle assembleRelease（正式签名）
  verify-apk.ps1     产物校验：签名证书 / 包内页面 hash / 版本号
  gen-icons.js       由牌面图生成启动图标（抠图 + 深色底合成）
  fetch-images.ps1   从 Wikimedia Commons 下载 78 张 RWS 原图 + 牌背（需要 tests/imageinfo.json）
  compress-images.ps1 压缩为 300px JPEG（输出 tests/images-opt/）
  gen-card-images.js 由压缩图生成 src/js/data/15-card-images.js（base64 内联）
  shots.ps1          无头 Chrome 生成各页面手机视口截图
tests/               回归产物与截图（imageinfo.json、自检 dump、shots/）
keystore/            release 签名密钥（git 忽略，含 README.txt 记录口令）
docs/                本文档 + HANDOFF.md
```

## 常用命令

```powershell
node _tools\build.js                     # 构建单文件
powershell -NoProfile -ExecutionPolicy Bypass -File _tools\verify.ps1   # 一键验证
powershell -NoProfile -ExecutionPolicy Bypass -File _tools\build-release.ps1  # 打包 APK
powershell -NoProfile -ExecutionPolicy Bypass -File _tools\verify-apk.ps1     # 校验 APK

# 更新牌面图片流水线（网络下载 → 压缩 → 生成 base64 模块）
powershell -NoProfile -ExecutionPolicy Bypass -File _tools\fetch-images.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File _tools\compress-images.ps1
node _tools\gen-card-images.js
```

## 数据模型

每张牌一个对象：

```js
{
  id: 'm00',            // 唯一 id
  arcana: 'major'|'minor',
  suit: 'wands'|'cups'|'swords'|'pentacles',   // minor 才有
  rank: 'ace'|'two'|...|'king',                 // minor 才有
  glyph: '🎒',          // major 的牌面符号
  name: '愚者', nameEn: 'The Fool',
  upright:  { summary, keywords[], today:{career,love,wealth,health,social,spirit} },
  reversed: { summary, keywords[], today:{...} },   // major 有逐维度 curated 文案
  desc: '牌面描述'
}
```

小阿卡纳的“今日六维”由 `data/10-dims.js` 的生成器合成：
`花色维度模板（4 花色 × 6 维度 × 正逆位）+ 数字/宫廷收尾短语（14 种 × 正逆位）`。

牌面视觉：78 张牌全部使用 Rider-Waite（RWS 1909）原版扫描图（公有领域），
由 `data/15-card-images.js` 以 base64 内联，单文件离线可用；牌背使用原版 Roses & Lilies 图案。
图片 key 与牌 id 一一对应（major `m00-m21`，minor `w/c/s/p-ace/2..10/page/knight/queen/king`）。
翻转语义：未翻转=牌背朝上（面朝下），flipped=翻开显示牌面；逆位时牌面内容旋转 180°（`.card-front.rev`）。

## 页面

- **今日**：每日一抽（`TodayStore` 按日期持久化），六维解读（事业/感情/财运/健康/人际/心灵），可重新抽取（底部 sheet 确认）。
- **图鉴**：78 张牌分组（大阿卡纳 + 四花色），默认折叠、点击分组标题展开/收起；搜索牌名/英文/关键词时自动展开命中组，已学习星标。
- **牌义详情**：正/逆位含义、关键词、牌面描述、已学习开关、无限条备注（轻点编辑、左滑删除，每条 ≤500 字）。
- **我的**：学习进度、已学习列表、导出/导入 JSON 备份、重置（sheet 确认）、关于/更新记录。
- **全局交互**：功能页左右滑动切换（首尾相连）；底部一字导航（今/鉴/我）；弹层均为底部 sheet。

## 本地存储键（localStorage）

| 键 | 内容 |
| --- | --- |
| `tarot.notes` | `{ cardId: [{text, ts}] }`，按时间倒序 |
| `tarot.learned` | 已学习牌 id 数组 |
| `tarot.today` | `{date, cardId, orientation}` 当日抽牌 |
| `tarot.backups` | 浏览器预览降级的备份列表（原生 App 用文件存储，只留 2 份） |

## 回归验证

`?selftest` 会跑 19 项自检（数据完整性 78 张、六维齐全、牌面图片、存储读写、各页渲染冒烟、弹层/重新抽取/备注/图鉴跳详情交互），
结果写入 `<div id="selftest" data-result="PASS|FAIL">`，由 verify.ps1 用无头 Chrome dump 后断言。
`?qa` 输出布局度量（横向溢出、背景色、关键元素位置）；`?page=glossary|detail&card=|me|today` 可直达页面预览。

## 原生桥 / 备份 / 更新架构

- **JS 桥**：原生以 `@JavascriptInterface` 挂到 `window.AppNative`；JS 统一走 `NativeBridge.call`，回调经 `window.onBridgeResult(cbId, payload)` 回传。浏览器预览时 `NativeBridge.ok=false`，自动降级（备份存 localStorage、更新提示“打包后可用”）。
- **备份**：`Backups.save/list/restore/remove` 原生优先（`filesDir/backups`，只保留最近 2 份），浏览器降级 localStorage。我的页“备份与更新”面板可查看/恢复/删除。
- **在线更新**：打开 App 后 JS 自动调 `checkUpdate` → 原生查 GitHub Releases（API 优先，403/拦截自动降级网页接口 expanded_assets）→ 有新版本时 JS 弹底部 sheet → “立即更新”先 `backups.save`（失败则取消）→ `startUpdate` 下载（通知栏进度）→ SHA-256 校验（API 通道有 digest 时）→ FileProvider 调系统安装器。
- **发版**：`Updater.java` 的 OWNER/REPO 指向 GitHub `bgwfsj/taluo`；Release 附件命名 `bu-<版本>.apk`（纯 ASCII）。签名密钥 `keystore/tarot-release.jks`（git 忽略，永久不变，换证书会要求卸载重装）。

## 发版清单（每版必做）

1. 同步版本号：`src/js/01-const.js`（APP_INFO.version + changelog）、`TarotApk/app/build.gradle`（versionCode+1、versionName）、`MainActivity.VERSION_NAME`。
2. `verify.ps1` 页面回归全 PASS → `build-release.ps1` 打包 → `verify-apk.ps1` 校验（签名证书 SHA-256 与上版一致、包内页面 hash 一致、版本号正确）。
3. 复制产物：`塔罗.apk`（当前）、`塔罗-v<版本>.apk`（留档）、`bu-<版本>.apk`（上传件）；旧 `塔罗-v<上一版>.apk` 移入 `历史版本/发布包归档/`。
4. git add/commit/tag v<版本> → push → GitHub Release（上传 `bu-<版本>.apk`）。
