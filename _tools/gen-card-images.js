'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const dir = path.join(ROOT, 'tests', 'images-opt');
const out = path.join(ROOT, 'src', 'js', 'data', '15-card-images.js');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg') && f !== 'back.jpg' && f !== 'back-cropped.jpg').sort();
const lines = [];
lines.push('// ===== 牌面图片（RWS 1909 Rider-Waite 原版扫描，公有领域；来源 Wikimedia Commons）=====');
lines.push('// 每张牌约 300px 宽 JPEG，base64 内联，保证单文件离线可用。');
lines.push('const CARD_IMAGES = {');
for (const f of files) {
  const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
  const id = path.basename(f, '.jpg');
  lines.push("  '" + id + "': 'data:image/jpeg;base64," + b64 + "',");
}
lines.push('};');
const backB64 = fs.readFileSync(path.join(dir, 'back-cropped.jpg')).toString('base64');
lines.push("const CARD_BACK_IMAGE = 'data:image/jpeg;base64," + backB64 + "';");
fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
console.log('generated: ' + out + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
