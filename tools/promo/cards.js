/* Renderuje plansze (PNG 1920x1080) i nakładki z napisami (PNG z alfą) tą samą czcionką co gra.
   Użycie: NODE_PATH=... node tools/promo/cards.js <katalog_wyjściowy> */
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const OUT = path.resolve(process.argv[2] || 'promo/cards'); fs.mkdirSync(OUT, { recursive: true });
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">';
const CSS = `<style>
  html,body{margin:0;width:1920px;height:1080px;overflow:hidden}
  body{background:#05070f;color:#e8e6f0;font-family:'VT323',monospace;display:flex;align-items:center;justify-content:center;text-align:center}
  body.clear{background:transparent}
  .px{font-family:'Press Start 2P',monospace}
  h1{font-size:76px;line-height:1.5;margin:0 0 30px;color:#fff;text-shadow:8px 8px 0 #3a1a5a}
  .sub{font-size:54px;opacity:.9;margin:0}
  .small{font-size:40px;opacity:.6;letter-spacing:2px}
  .big{font-size:72px;line-height:1.25;max-width:1500px;margin:0 auto}
  .url{font-size:34px;color:#ffd166;margin-top:46px}
  .band{position:absolute;left:0;right:0;bottom:0;padding:38px 80px 150px;background:linear-gradient(rgba(5,7,15,0),rgba(5,7,15,.92) 35%);text-align:left}
  .band .tag{font-size:34px;letter-spacing:2px;margin-bottom:18px}
  .band .txt{font-size:56px;line-height:1.1;color:#fff}
  .inside{color:#7c5cff}.outside{color:#ff4d4d}.yellow{color:#ffd166}
  .center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
</style>`;
const cards = {
  card_01: `<div><p class="small">NOC Z 30 NA 31 PAŹDZIERNIKA 2026 · AL. SZUCHA 12A</p><p class="big">Jedni mówią: przywracamy praworządność.<br>Drudzy: bronimy porządku konstytucyjnego.</p></div>`,
  card_02: `<div><h1 class="px">STAN WYŻSZEJ<br>KONIECZNOŚCI</h1><p class="sub">gra, w której wybierasz stronę sporu o Trybunał</p></div>`,
  card_03: `<div><p class="px" style="font-size:60px;line-height:1.6;color:#fff">JEST TRZECI LICZNIK.</p></div>`,
  card_04: `<div><p class="big">Każda noc w Trybunale<br>kończy się tak samo.</p><p class="px url">agentsmill.github.io/stan-wyzszej-koniecznosci</p><p class="small" style="margin-top:30px">darmowa, w przeglądarce, 6 minut. Zagraj drugą stroną.</p></div>`,
};
const overlays = {
  ov_menu: `<div class="band"><div class="px tag yellow">WYBIERZ, KOGO BRONISZ</div><div class="txt">Obie strony twierdzą, że bronią Trybunału. Gra tego nie rozstrzyga.</div></div>`,
  ov_inside: `<div class="band"><div class="px tag inside">GRASZ WEWNĄTRZ</div><div class="txt">kordony policji, sędziowie w drzwiach, zarządzenia, komunikaty na X, wnioski o immunitet</div></div>`,
  ov_outside: `<div class="band"><div class="px tag outside">GRASZ NA ZEWNĄTRZ</div><div class="txt">tłum pod bramą, poseł z nożycami, prezes partii, „państwo policyjne"</div></div>`,
  ov_president: `<div class="band"><div class="px tag outside">PREZYDENT</div><div class="txt">Przez kordon przechodzi tylko Prezydent. „Nie jesteście sędziami."</div></div>`,
  ov_citizens: `<div class="band"><div class="px tag yellow">LICZNIK POLSKA</div><div class="txt">Spada od działań obu stron. Obywatele ze skargą konstytucyjną zawracają.</div></div>`,
  ov_ending: `<div class="band"><div class="px tag yellow">EKRAN KOŃCOWY</div><div class="txt">Niezależnie od tego, kto wygrał.</div></div>`,
};
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  for (const [name, html] of Object.entries(cards)) {
    await page.setContent(FONTS + CSS + `<body>${html}</body>`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('plansza', name);
  }
  for (const [name, html] of Object.entries(overlays)) {
    await page.setContent(FONTS + CSS + `<body class="clear">${html}</body>`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, name + '.png'), omitBackground: true }); console.log('nakładka', name);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
