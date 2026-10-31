/* Kinetyczne napisy (PNG z alfą 1920x1080): jedno hasło na ujęcie. Użycie: NODE_PATH=... node tools/promo/kinetic.js <katalog_wyj> */
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const OUT = path.resolve(process.argv[2] || 'promo/kinetic'); fs.mkdirSync(OUT, { recursive: true });
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">';
const CSS = `<style>html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:transparent}
.k{position:absolute;left:0;right:0;top:120px;text-align:center;font-family:'Press Start 2P',monospace;color:#fff;font-size:64px;line-height:1.5;text-shadow:6px 6px 0 #000,-3px -3px 0 #000,3px -3px 0 #000,-3px 3px 0 #000}
.k span{display:inline-block;background:rgba(5,7,15,.82);padding:18px 40px;border:4px solid #fff}
.k.red span{border-color:#ff4d4d;color:#ff4d4d}.k.purple span{border-color:#7c5cff;color:#9f8cff}.k.yellow span{border-color:#ffd166;color:#ffd166}
.k.small{font-size:44px}.k.big{font-size:84px}.k.bottom{top:auto;bottom:170px}</style>`;
const words = {
  w_wybierz: ['WYBIERZ STRONĘ.', 'yellow'], w_kordon: ['KORDON.', 'purple'], w_sedziowie: ['SĘDZIOWIE W DRZWIACH.', 'purple small'],
  w_akta: ['50 TOMÓW AKT.', 'purple small'], w_przerwa: ['PRZERWA W CZYNNOŚCIACH.', 'purple small'], w_tlum: ['TŁUM.', 'red'],
  w_ciecie: ['CIĘCIE.', 'red'], w_policyjne: ['„PAŃSTWO POLICYJNE".', 'red small'], w_polska: ['POLSKA −15', 'yellow big'],
  w_prezydent: ['PREZYDENT.', 'red big'], w_sedziami: ['„NIE JESTEŚCIE SĘDZIAMI."', 'red small'], w_boczne: ['BOCZNE WEJŚCIE.', 'red small bottom'],
  w_zawsze: ['ZAWSZE.', 'yellow big'], w_kto: ['KTO WYGRAŁ?', 'yellow'],
};
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  for (const [name, [text, cls]] of Object.entries(words)) {
    await page.setContent(FONTS + CSS + `<body><div class="k ${cls}"><span>${text}</span></div></body>`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, name + '.png'), omitBackground: true }); console.log('napis', name);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
