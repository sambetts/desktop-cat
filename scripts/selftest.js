// Smoke test: electron scripts/selftest.js  -> runs the app, captures the overlay to /tmp/cat-shot.png, prints errors.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
require('../main.js');
app.whenReady().then(() => {
  const w = () => BrowserWindow.getAllWindows().find((x) => x.isAlwaysOnTop());
  setTimeout(() => w().webContents.send('toy', 'yarn'), 2000);
  setTimeout(() => w().webContents.send('toy', 'food'), 2500);
  setTimeout(async () => {
    console.log('state', JSON.stringify(await w().webContents.executeJavaScript('(()=>{const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return {drawn:n,cat:{x:cat.x,y:cat.y,state:cat.state},toys:toys.length}})()')));
    const img = await w().webContents.capturePage();
    fs.writeFileSync('/tmp/cat-shot.png', img.toPNG());
    console.log('captured', img.getSize());
    app.exit(0);
  }, 6000);
  BrowserWindow.getAllWindows().forEach((x) => x.webContents.on('console-message', (_, l, m) => console.log('console:', m)));
});
