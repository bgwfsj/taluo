// 构建脚本：把 src/ 下的模板、CSS、JS 合成一个自包含单文件 tarot.html
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'tarot.html');

// 递归收集 css/js；按文件名数字前缀排序，无前缀的排最后
function collect(baseDir, ext) {
  const out = [];
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(ext)) out.push(path.relative(SRC, full));
    }
  })(baseDir);
  return out.sort(function (a, b) {
    const an = Number((path.basename(a).match(/^(\d+)/) || [0])[1] || '999');
    const bn = Number((path.basename(b).match(/^(\d+)/) || [0])[1] || '999');
    return an - bn || a.localeCompare(b);
  });
}

const cssFiles = collect(path.join(SRC, 'css'), '.css');
const jsFiles = collect(path.join(SRC, 'js'), '.js');

const cssBlock = cssFiles.length
  ? '<style>\n' + cssFiles.map(f => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^\uFEFF/, '')).join('\n') + '\n</style>'
  : '';
const jsBlock = jsFiles.length
  ? '<script>\n' + jsFiles.map(f => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^\uFEFF/, '')).join('\n') + '\n</script>'
  : '';

let html = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');

const inlineHandlers = html.match(/on(click|load|change|submit|input|keydown|keyup|touchstart|touchend)\s*=/gi) || [];
if (inlineHandlers.length) {
  console.error('[build] 模板存在内联事件处理器（应改用 addEventListener）: ' + inlineHandlers.join(', '));
  process.exit(1);
}

html = html.replace('{{CSS}}', cssBlock).replace('{{JS}}', jsBlock);

const leftovers = html.match(/\{\{\w+\}\}/g) || [];
if (leftovers.length) {
  console.error('[build] 模板占位符未替换: ' + leftovers.join(', '));
  process.exit(1);
}

fs.writeFileSync(OUT, html, 'utf8');
console.log('[build] 完成: ' + OUT + ' (' + Buffer.byteLength(html, 'utf8') + ' bytes), js=' + jsFiles.length + ', css=' + cssFiles.length);
console.log('[build] js 顺序: ' + jsFiles.join(', '));
