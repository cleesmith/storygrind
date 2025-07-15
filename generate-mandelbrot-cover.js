#!/usr/bin/env node
/**
 * Robust, Electron-compatible Mandelbrot Cover Generator
 * Usage:
 *   npx electron ./generate-mandelbrot-cover.js --title "Book Title" --author "Author" --out ./cover.jpg
 */

const { app, BrowserWindow } = require('electron');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title') options.title = args[++i];
    else if (args[i] === '--author') options.author = args[++i];
    else if (args[i] === '--out') options.out = args[++i];
  }
  if (!options.out) {
    console.error('Usage: npx electron ./generate-mandelbrot-cover.js --title "Book Title" --author "Author" --out ./cover.jpg');
    process.exit(1);
  }
  return options;
}

const opts = parseArgs();

let win = null;
app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1700,
    height: 2650,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
    }
  });

  // HTML page with all logic inline—no injection
  const html = `
  <html>
  <body>
  <script>
    (async () => {
      try {
        const fs = require('fs');
        const title = ${JSON.stringify(opts.title)};
        const author = ${JSON.stringify(opts.author)};
        const out = ${JSON.stringify(opts.out)};
        const width = 1600, height = 2560;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const maxIter = 60;
        const imageData = ctx.createImageData(width, height);
        function colorFunc(iter, maxIter, x, y) {
          if (iter === maxIter) return [20,20,30];
          let t = iter / maxIter;
          return [
            Math.floor(200 + 55 * Math.sin(8*t)),
            Math.floor(80 + 120 * Math.cos(5*t + x/40)),
            Math.floor(200 + 55 * Math.cos(7*t + y/80))
          ];
        }
        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            let cr = (x / width) * 3.5 - 2.5;
            let ci = (y / height) * 2.0 - 1.0;
            let zr = 0, zi = 0, iter = 0;
            while (zr*zr + zi*zi < 4 && iter < maxIter) {
              let tmp = zr*zr - zi*zi + cr;
              zi = 2*zr*zi + ci;
              zr = tmp;
              iter++;
            }
            let idx = (y * width + x) * 4;
            let [r,g,b] = colorFunc(iter, maxIter, x, y);
            imageData.data[idx + 0] = r;
            imageData.data[idx + 1] = g;
            imageData.data[idx + 2] = b;
            imageData.data[idx + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        ctx.font = 'bold 140px Arial, sans-serif';
        ctx.fillStyle = '#ffffffcc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = '#222';
        ctx.shadowBlur = 16;
        let lines = (title || 'Untitled').toUpperCase().match(/.{1,22}( |$)/g) || [];
        lines.forEach((line, i) => {
          ctx.fillText(line.trim(), width/2, 260 + i * 170);
        });
        ctx.shadowBlur = 10;
        ctx.font = 'bold 90px Arial, sans-serif';
        ctx.fillText((author || '').toUpperCase(), width/2, height - 260);
        ctx.shadowBlur = 0;
        const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.94);
        const jpgData = jpgDataUrl.replace(/^data:image\\/jpeg;base64,/, '');
        fs.writeFileSync(out, Buffer.from(jpgData, 'base64'));
        document.body.innerHTML = '<pre style="font-size:28px">Cover saved to:<br>' + out + '</pre>';
        setTimeout(() => { window.close(); }, 800);
      } catch (err) {
        document.body.innerHTML = '<pre style="color:red;font-size:24px">Error:<br>' + (err.stack||err.message||err) + '</pre>';
        setTimeout(() => { window.close(); }, 4000);
      }
    })();
  </script>
  </body>
  </html>
  `;

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
});
