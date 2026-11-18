# 塔罗之语 · 交接文档

当前版本：v0.4.2（2026-11-18）

## 一句话
清爽简约的纯前端塔罗牌 App：每日一抽 + 六维解读、78 张牌正/逆位图鉴、
已学习标记、每牌无限条备注（每条 ≤500 字）。数据全部存本地 localStorage，离线可用。

## 交付物
- `tarot.html`：自包含单文件（约 5.8MB，含 78 张牌面图 base64，浏览器直接打开即用，手机友好，底部悬浮一字导航）。
- `src/`：模块化源码（模板 + 按页拆分 CSS/JS + 塔罗数据 + `data/15-card-images.js` 牌面图片）。
- `TarotApk/`：安卓 WebView 壳工程（MainActivity + JS 桥 + 在线更新器 + 备份存储），图标为圣杯国王。
- `塔罗.apk`：当前安装包（v0.4.2，正式签名）；`塔罗-v0.4.2.apk` 留档；旧版归档在 `历史版本/发布包归档/`；`bu-<版本>.apk` 为 GitHub Release 上传件（纯 ASCII 名）。
- `_tools/`：build / verify / shots / gen-icons.js / build-release（Gradle 打包）/ verify-apk（产物校验）脚本。
- 自检 21 项全 PASS（含牌面图片完整性 + 弹层/重新抽取/备注/图鉴跳详情 + 备份保留 2 份交互冒烟）。

## 功能清单
- 今日之牌：轻点牌背抽牌 → 翻转展示 正/逆位、总览、关键词、六维解读（事业/感情/财运/健康/人际/心灵）；每日一抽持久化，可重新抽取。
- 图鉴：78 张牌按大阿卡纳/四花色分组（默认折叠，可点击分组标题展开/收起），支持搜索（命中自动展开），星标已学习。
- 牌义详情：正位/逆位含义 + 关键词 + 牌面描述；轻触牌面切换正逆位视觉；已学习开关；无限条备注（轻点编辑、左滑删除，500 字上限）。
- 我的：学习进度条、已学习列表、导出/导入 JSON 备份、重置数据、关于与更新记录。
- 备份与更新：本地存档备份（只保留最近 2 份，可查看/恢复/删除）；在线更新（打开 App 自动检测 GitHub 新版本，更新前自动备份，下载走通知栏进度，SHA-256 校验后调用系统安装器）。
- 交互：功能页左右滑动切换（首尾相连）；底部一字导航（今/鉴/我）；弹层一律为底部 sheet。

## 数据内容
- 大阿卡纳 22 张：逐张 curated 正逆位摘要/关键词/六维今日解读/牌面描述。
- 小阿卡纳 56 张：逐张正逆位摘要/关键词/描述；六维今日解读由“花色×维度×正逆位 + 数字/宫廷收尾”模板生成。
- 牌面图片：RWS 1909 原版（Pamela Colman Smith，公有领域），来自 Wikimedia Commons，压缩为 300px JPEG 后 base64 内联（图片数据在 `data/15-card-images.js`，可由 `_tools` 流水线重新生成）。

## UI 风格（airy-minimal-ui）
浅底 #f6f8fa + 顶部绿/底部蓝径向光晕 + 44px 网格氛围；白卡片细线极轻阴影；
主色绿 #0aa87a、辅蓝 #0b8ed6、弱文字 #8b9aa6；呼吸圆点/光晕动效；底部 sheet 弹层；
功能页一字导航 + 左右滑动切页；尊重 prefers-reduced-motion。

## 待办（用户下一阶段）
1. 可选：抽牌历史、每日提醒、多牌阵等。
2. 后续发版：改版本号（src/js/01-const.js 与 TarotApk/app/build.gradle 同步）→ verify → build-release → verify-apk → 复制产物 → git tag → GitHub Release。

## 关键路径
- 构建单文件：`node _tools\build.js`
- 页面回归：`powershell -NoProfile -ExecutionPolicy Bypass -File _tools\verify.ps1`
- 打包 APK：`powershell -NoProfile -ExecutionPolicy Bypass -File _tools\build-release.ps1`
- 产物校验：`powershell -NoProfile -ExecutionPolicy Bypass -File _tools\verify-apk.ps1`
- 打开预览：直接双击 `tarot.html`，或 `?page=glossary|detail&card=m00|me|today` 直达页面。
- 在线更新源：GitHub `bgwfsj/taluo` Release（App 内 `Updater.java` 的 OWNER/REPO 常量）。
