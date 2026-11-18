const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.dirname(path.dirname(__filename));
const cardSrc = fs.readFileSync(path.join(root, 'src/js/data/15-card-images.js'), 'utf8');
const m = cardSrc.match(/['"]c-king['"]:\s*['"](data:image\/jpeg;base64,[^'"]+)['"]/);
if (!m) { console.error('c-king image not found'); process.exit(1); }
const dataUrl = m[1];

const sizes = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };
const out = Object.keys(sizes).map(k => path.join(root, 'TarotApk/app/src/main/res', k));

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<canvas id="c" width="300" height="195"></canvas>
<div id="out"></div>
<script>
const img = new Image();
img.onload = () => {
  const W = 300, cropTop = 55, cropH = 195;
  const c = document.getElementById('c');
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, cropTop, W, cropH, 0, 0, W, cropH);
  const id = ctx.getImageData(0, 0, W, cropH);
  const d = id.data;
  const px = (x,y) => { const i=(y*W+x)*4; return [d[i],d[i+1],d[i+2]]; };
  const dist = (a,b) => Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);
  const samples = [];
  for (let y=2;y<cropH-2;y+=3){ samples.push(px(2,y)); samples.push(px(W-3,y)); }
  for (let x=2;x<W-2;x+=3){ samples.push(px(x,2)); }
  samples.sort((a,b)=>a[0]-b[0]);
  const bg = samples[Math.floor(samples.length/2)];
  const TOL = 26;
  const visited = new Uint8Array(W*cropH);
  const q = [];
  const push = (x,y) => { if (x<0||y<0||x>=W||y>=cropH) return; const i=y*W+x; if (visited[i]) return; visited[i]=1; q.push(i); };
  for (let x=0;x<W;x++){ push(x,0); push(x,cropH-1); }
  for (let y=0;y<cropH;y++){ push(0,y); push(W-1,y); }
  let head = 0;
  while (head < q.length) {
    const i = q[head++];
    const x = i % W, y = (i / W) | 0;
    const col = [d[i*4], d[i*4+1], d[i*4+2]];
    if (dist(col, bg) >= TOL) continue;
    d[i*4+3] = 0;
    push(x+1,y); push(x-1,y); push(x,y+1); push(x,y-1);
  }
  for (let y=1;y<cropH-1;y++) for (let x=1;x<W-1;x++) {
    const i=(y*W+x)*4;
    if (d[i+3]===0) continue;
    const hasTransp = (d[(y*W+x-1)*4+3]===0)||(d[(y*W+x+1)*4+3]===0)||(d[((y-1)*W+x)*4+3]===0)||(d[((y+1)*W+x)*4+3]===0);
    if (hasTransp && dist([d[i],d[i+1],d[i+2]], bg) < 46) d[i+3]=0;
  }
  ctx.putImageData(id, 0, 0);
  const fig = c;
  const results = {};
  const S = {${Object.keys(sizes).map(k => `'${k}':${sizes[k]}`).join(',')}};
  for (const key of Object.keys(S)) {
    const s = S[key];
    for (const round of [false, true]) {
      const cv = document.createElement('canvas');
      cv.width = s; cv.height = s;
      const g = cv.getContext('2d');
      // 深色渐变底（翠绿 → 深蓝），无白底
      const gr = g.createLinearGradient(0, 0, 0, s);
      gr.addColorStop(0, '#0e7c60');
      gr.addColorStop(1, '#0a548a');
      g.fillStyle = gr;
      g.fillRect(0, 0, s, s);
      if (round) {
        g.beginPath();
        g.arc(s/2, s/2, s/2, 0, Math.PI*2);
        g.clip();
      }
      // 人物放大：86% 宽，居中
      const fw = s * 0.86;
      const fh = fw * cropH / W;
      g.drawImage(fig, (s-fw)/2, (s-fh)/2, fw, fh);
      results[key + (round ? '_round' : '')] = cv.toDataURL('image/png');
    }
  }
  document.getElementById('out').textContent = JSON.stringify(results);
};
img.src = '${dataUrl}';
</script>
</body></html>`;

const procHtml = path.join(root, 'tests/_icon-proc.html');
const dumpFile = path.join(root, 'tests/_icon-dump.html');
fs.writeFileSync(procHtml, html);

const chromeCandidates = [
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];
const chrome = chromeCandidates.find(p => fs.existsSync(p));
if (!chrome) { console.error('Chrome not found'); process.exit(1); }
const url = 'file:///' + procHtml.replace(/\\/g, '/').replace(/ /g, '%20');
const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=8000', '--dump-dom', url], { encoding: 'utf8' });
const dump = r.stdout;
fs.writeFileSync(dumpFile, dump);
const m2 = dump.match(/<div id="out">(\{.*\})<\/div>/s);
if (!m2) { console.error('no output from processor'); process.exit(1); }
const results = JSON.parse(m2[1]);
for (const key of Object.keys(sizes)) {
  const dir = path.join(root, 'TarotApk/app/src/main/res', key);
  fs.mkdirSync(dir, { recursive: true });
  const sq = Buffer.from(results[key].split(',')[1], 'base64');
  const rd = Buffer.from(results[key + '_round'].split(',')[1], 'base64');
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), sq);
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), rd);
  console.log('icon', key, sizes[key] + 'px', sq.length, rd.length);
}
fs.unlinkSync(procHtml);
fs.unlinkSync(dumpFile);
console.log('icons generated');
