/* Plansze i nakładki 1080x1920 (9:16). Gra w nagraniu pionowym zajmuje pas y 636..1284.
   Użycie: NODE_PATH=... node tools/promo/cards_vertical.js <katalog_wyjściowy> */
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const OUT = path.resolve(process.argv[2] || 'promo/cards_v'); fs.mkdirSync(OUT, { recursive: true });
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">';
const CSS = `<style>
  html,body{margin:0;width:1080px;height:1920px;overflow:hidden}
  body{background:#05070f;color:#e8e6f0;font-family:'VT323',monospace;text-align:center;position:relative}
  body.clear{background:transparent}
  .px{font-family:'Press Start 2P',monospace}
  .center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 70px}
  h1{font-size:66px;line-height:1.5;margin:0 0 34px;color:#fff;text-shadow:7px 7px 0 #3a1a5a}
  .sub{font-size:54px;opacity:.9;margin:0;line-height:1.15}
  .small{font-size:38px;opacity:.6;letter-spacing:2px;line-height:1.2}
  .big{font-size:64px;line-height:1.2;margin:0}
  .url{font-size:26px;color:#ffd166;margin-top:50px;line-height:1.6}
  .top{position:absolute;left:0;right:0;top:0;height:636px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 60px;background:linear-gradient(rgba(5,7,15,.0),rgba(5,7,15,.0))}
  .bottom{position:absolute;left:0;right:0;top:1284px;height:636px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 60px}
  .tag{font-size:34px;letter-spacing:2px;margin-bottom:26px}
  .txt{font-size:52px;line-height:1.12;color:#fff}
  .inside{color:#7c5cff}.outside{color:#ff4d4d}.yellow{color:#ffd166}
</style>`;
const cards = {
  cardv_01: `<div class="center"><p class="small">NOC Z 30 NA 31 PAŹDZIERNIKA 2026<br>AL. SZUCHA 12A</p><h1 class="px" style="margin-top:50px">STAN WYŻSZEJ<br>KONIECZNOŚCI</h1><p class="sub">gra, w której wybierasz<br>stronę sporu o Trybunał</p></div>`,
  cardv_04: `<div class="center"><p class="big">Każda noc w Trybunale<br>kończy się tak samo.</p><p class="px url">agentsmill.github.io/<br>stan-wyzszej-koniecznosci</p><p class="small" style="margin-top:40px">darmowa, w przeglądarce, 6 minut.<br>Zagraj drugą stroną.</p></div>`,
};
const overlays = {
  ovv_inside: `<div class="top"><div class="px tag inside">GRASZ WEWNĄTRZ</div><div class="txt">kordony policji, sędziowie w drzwiach, zarządzenia, komunikaty na X</div></div><div class="bottom"><div class="txt" style="opacity:.85">Jedni mówią: przywracamy praworządność.<br>Drudzy: bronimy porządku konstytucyjnego.</div></div>`,
  ovv_polska: `<div class="top"><div class="px tag yellow">JEST TRZECI LICZNIK.</div><div class="txt">Spada od działań obu stron.</div></div><div class="bottom"><div class="txt" style="opacity:.85">Obywatele ze skargą konstytucyjną zawracają spod drzwi. POLSKA −2.</div></div>`,
  ovv_outside: `<div class="top"><div class="px tag outside">GRASZ NA ZEWNĄTRZ</div><div class="txt">tłum pod bramą, poseł z nożycami, prezes partii, Prezydent</div></div><div class="bottom"><div class="txt" style="opacity:.85">Przez kordon przechodzi tylko Prezydent.<br>„Nie jesteście sędziami."</div></div>`,
  ovv_ending: `<div class="top"><div class="px tag yellow">EKRAN KOŃCOWY</div><div class="txt">Niezależnie od tego, kto wygrał.</div></div>`,
};
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  for (const [name, html] of Object.entries(cards)) { await page.setContent(FONTS + CSS + `<body>${html}</body>`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('plansza', name); }
  for (const [name, html] of Object.entries(overlays)) { await page.setContent(FONTS + CSS + `<body class="clear">${html}</body>`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, name + '.png'), omitBackground: true }); console.log('nakładka', name); }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
