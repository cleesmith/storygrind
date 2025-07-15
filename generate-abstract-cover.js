#!/usr/bin/env node
/**
 * Always-exiting, cross-platform Abstract Cover Generator (Electron/Canvas)
 * Usage:
 *   npx electron ./generate-abstract-cover-nohang.js --title "Book Title" --author "Author" --out ./cover.jpg
 */

const { app, BrowserWindow, ipcMain } = require('electron');
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title') options.title = args[++i];
    else if (args[i] === '--author') options.author = args[++i];
    else if (args[i] === '--out') options.out = args[++i];
  }
  if (!options.out) {
    console.error('Usage: npx electron ./generate-abstract-cover-nohang.js --title "Book Title" --author "Author" --out ./cover.jpg');
    process.exit(1);
  }
  return options;
}
const opts = parseArgs();
let didExit = false;
function exitHard() {
  if (!didExit) {
    didExit = true;
    setTimeout(() => process.exit(0), 200);
  }
}
app.on('window-all-closed', () => {
  exitHard();
});
app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1700,
    height: 2650,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
    }
  });
  const html = `
  <html><body><script>
    (async () => {
      try {
        const fs = require('fs');
        const { ipcRenderer } = require('electron');
        const title = ${JSON.stringify(opts.title)};
        const author = ${JSON.stringify(opts.author)};
        const out = ${JSON.stringify(opts.out)};
        const width = 1600, height = 2560;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Fast gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#8dd4fc');
        grad.addColorStop(1, '#ecb8fa');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // RGBA color helper!
        function randomColor(alpha=0.18) {
          const hexColors = ['#ffffff','#e8ffea','#fbeaff','#ffe3e3','#e3eaff','#dbf5fc','#ffe4eb','#ffefba','#e5e4fa','#e7b3fa'];
          const hex = hexColors[Math.floor(Math.random() * hexColors.length)];
          const bigint = parseInt(hex.slice(1), 16);
          const r = (bigint >> 16) & 255;
          const g = (bigint >> 8) & 255;
          const b = bigint & 255;
          return \`rgba(\${r},\${g},\${b},\${alpha})\`;
        }

        // Draw a few big shapes for speed
        for (let i = 0; i < 4 + Math.floor(Math.random()*5); i++) {
          ctx.save();
          ctx.globalAlpha = 0.13 + Math.random() * 0.13;
          ctx.beginPath();
          const shapeType = Math.random();
          if (shapeType < 0.3) {
            ctx.ellipse(200+Math.random()*1200, 200+Math.random()*2100, 180+Math.random()*260, 110+Math.random()*190, Math.random()*Math.PI, 0, Math.PI*2);
          } else if (shapeType < 0.7) {
            // Polygon
            const sides=3+Math.floor(Math.random()*3); const r=100+Math.random()*180; const cx=200+Math.random()*1200; const cy=180+Math.random()*2000;
            for(let s=0;s<sides;s++){const ang=Math.PI*2*s/sides+Math.random()*0.8; const x=cx+Math.cos(ang)*r; const y=cy+Math.sin(ang)*r; if(s===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.closePath();
          } else {
            // Bar
            const w=120+Math.random()*140, h=36+Math.random()*38, x=80+Math.random()*(width-160-w), y=80+Math.random()*(height-160-h);
            ctx.translate(x+w/2, y+h/2); ctx.rotate(Math.random()*Math.PI*2); ctx.fillRect(-w/2,-h/2,w,h); ctx.restore(); continue;
          }
          ctx.fillStyle = randomColor();
          ctx.fill();
          ctx.restore();
        }

        // Title/author (white+shadow, for contrast)
        ctx.font = 'bold 140px Arial, sans-serif';
        ctx.fillStyle = '#ffffffee';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.shadowColor = '#000000cc'; ctx.shadowBlur = 12;
        let lines = (title || 'Untitled').toUpperCase().match(/.{1,22}( |$)/g) || [];
        lines.forEach((line, i) => { ctx.fillText(line.trim(), width/2, 260 + i * 170); });
        ctx.shadowBlur = 6; ctx.font = 'bold 90px Arial, sans-serif';
        ctx.fillText((author || '').toUpperCase(), width/2, height - 260);
        ctx.shadowBlur = 0;

        const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.91);
        const jpgData = jpgDataUrl.replace(/^data:image\\/jpeg;base64,/, '');
        fs.writeFileSync(out, Buffer.from(jpgData, 'base64'));

        if (typeof ipcRenderer !== 'undefined') ipcRenderer.send('done');
        setTimeout(() => { window.close(); }, 200);
      } catch (err) {
        if (typeof ipcRenderer !== 'undefined') ipcRenderer.send('done');
        setTimeout(() => { window.close(); }, 400);
      }
    })();
  <\\/script></body></html>
  `;
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
});
// Listen for renderer to request exit
ipcMain.on('done', () => exitHard());
// Failsafe: force-exit after 10s if something's stuck
setTimeout(exitHard, 10000);
