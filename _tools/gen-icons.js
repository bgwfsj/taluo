const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.dirname(path.dirname(__filename));
const cardSrc = fs.readFileSync(path.join(root, 'src/js/data/15-card-images.js'), 'utf8');
const m = cardSrc.match(/['"]c-king['"]:\s*['"](data:image\/jpeg;base64,[^'"]+)['"]/);
if (!m) { console.error('c-king image not found'); process.exit(1); }
const dataUrl = m[1];

const sizes = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<canvas id="c"></canvas><div id="out"></div>
<script>
const img = new Image();
img.onload = () => {
  // 只取中间人像：横向裁掉左右边条（x=25..265），纵向 55..250
  const SX = 25, SY = 55, SW = 240, SH = 195;
  const W = SW, H = SH;
  const c = document.getElementById('c');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, SX, SY, SW, SH, 0, 0, W, H);
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  const px = (x,y) => { const i=(y*W+x)*4; return [d[i],d[i+1],d[i+2]]; };
  const dist = (a,b) => Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);
  const samples = [];
  for (let y=0;y<8;y++) for (let x=0;x<W;x+=2) samples.push(px(x,y));
  samples.sort((a,b)=>a[0]-b[0]);
  const bg = samples[Math.floor(samples.length/2)];
  const TOL = 32;
  const visited = new Uint8Array(W*H);
  const q = [];
  const push = (x,y) => { if (x<0||y<0||x>=W||y>=H) return; const i=y*W+x; if (visited[i]) return; visited[i]=1; q.push(i); };
  for (let x=0;x<W;x++){ push(x,0); push(x,H-1); }
  for (let y=0;y<H;y++){ push(0,y); push(W-1,y); }
  let head = 0;
  while (head < q.length) {
    const i = q[head++];
    const x = i % W, y = (i / W) | 0;
    const col = [d[i*4], d[i*4+1], d[i*4+2]];
    if (dist(col, bg) >= TOL) continue;
    d[i*4+3] = 0;
    push(x+1,y); push(x-1,y); push(x,y+1); push(x,y-1);
  }
  for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++) {
    const i=(y*W+x)*4;
    if (d[i+3]===0) continue;
    const hasTransp = (d[(y*W+x-1)*4+3]===0)||(d[(y*W+x+1)*4+3]===0)||(d[((y-1)*W+x)*4+3]===0)||(d[((y+1)*W+x)*4+3]===0);
    if (hasTransp && dist([d[i],d[i+1],d[i+2]], bg) < 55) d[i+3]=0;
  }
  // 只保留最大连通块（人像），去掉孤立边条
  const comp = new Int32Array(W*H);
  for (let i=0;i<W*H;i++) comp[i] = d[i*4+3]>8 ? 0 : -1;
  let cid = 0; const counts = [];
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    const i=y*W+x;
    if (comp[i] !== 0) continue;
    cid++;
    let cnt = 0;
    const stack = [i];
    comp[i] = cid;
    while (stack.length) {
      const j = stack.pop();
      cnt++;
      const jx = j % W, jy = (j / W) | 0;
      const tryPush = (a,b) => { if (a<0||b<0||a>=W||b>=H) return; const k=b*W+a; if (comp[k]===0) { comp[k]=cid; stack.push(k); } };
      tryPush(jx+1,jy); tryPush(jx-1,jy); tryPush(jx,jy+1); tryPush(jx,jy-1);
    }
    counts[cid] = cnt;
  }
  let maxCid = 0;
  for (let k=1;k<=cid;k++) if (counts[k] > (counts[maxCid]||0)) maxCid = k;
  for (let i=0;i<W*H;i++) if (comp[i] !== maxCid) d[i*4+3] = 0;
  ctx.putImageData(id, 0, 0);
  let minX=W, minY=H, maxX=-1, maxY=-1;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (d[(y*W+x)*4+3] > 8) {
      if (x<minX) minX=x; if (x>maxX) maxX=x;
      if (y<minY) minY=y; if (y>maxY) maxY=y;
    }
  }
  const bw=maxX-minX+1, bh=maxY-minY+1;
  const figCv = document.createElement('canvas');
  figCv.width = bw; figCv.height = bh;
  figCv.getContext('2d').drawImage(c, minX, minY, bw, bh, 0, 0, bw, bh);
  const results = {};
  const S = {${Object.keys(sizes).map(k => `'${k}':${sizes[k]}`).join(',')}};
  for (const key of Object.keys(S)) {
    const s = S[key];
    for (const round of [false, true]) {
      const cv = document.createElement('canvas');
      cv.width = s; cv.height = s;
      const g = cv.getContext('2d');
      if (round) {
        g.beginPath();
        g.arc(s/2, s/2, s/2, 0, Math.PI*2);
        g.clip();
      }
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, s, s);
      const fit = s * 0.94;
      const scale = Math.min(fit/bw, fit/bh);
      const dw = bw*scale, dh = bh*scale;
      g.drawImage(figCv, (s-dw)/2, (s-dh)/2, dw, dh);
      results[key + (round ? '_round' : '')] = cv.toDataURL('image/png');
    }
  }
  document.getElementById('out').textContent = JSON.stringify(results);
};
img.src = '${dataUrl}';
</script></body></html>`;

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
fs.writeFileSync(dumpFile, r.stdout);
const m2 = r.stdout.match(/<div id="out">(\{.*\})<\/div>/s);
if (!m2) { console.error('no output from processor'); process.exit(1); }
const results = JSON.parse(m2[1]);
for (const key of Object.keys(sizes)) {
  const dir = path.join(root, 'TarotApk/app/src/main/res', key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), Buffer.from(results[key].split(',')[1], 'base64'));
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), Buffer.from(results[key + '_round'].split(',')[1], 'base64'));
}
fs.unlinkSync(procHtml);
fs.unlinkSync(dumpFile);
console.log('icons regenerated (white background, figure only)');
