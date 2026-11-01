'use strict';
/* ============================================================
   I18N: język (pl/en), słownik tekstów w kodzie, spłaszczanie
   dwujęzycznych pól {pl, en} w danych gry, teksty w HTML.
   ============================================================ */
const I18N = {
  lang: 'pl',
  detect() {
    const q = new URLSearchParams(location.search).get('lang');
    let saved = null; try { saved = localStorage.getItem('swk_lang'); } catch (_) { /* brak storage */ }
    const nav = (navigator.language || 'pl').toLowerCase();
    const pick = q || saved || (nav.startsWith('pl') ? 'pl' : 'en');
    this.lang = pick === 'en' ? 'en' : 'pl';
    document.documentElement.lang = this.lang;
    return this.lang;
  },
  set(lang) { try { localStorage.setItem('swk_lang', lang); } catch (_) { /* brak storage */ } const u = new URL(location.href); u.searchParams.set('lang', lang); location.href = u.toString(); },
};
I18N.detect();

/* {pl, en} -> string w bieżącym języku; inne wartości bez zmian */
function L(v) { return (v && typeof v === 'object' && !Array.isArray(v) && 'pl' in v && 'en' in v) ? v[I18N.lang] : v; }
function localizeDeep(o) {
  if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = localizeDeep(o[i]); return o; }
  if (o && typeof o === 'object') {
    if ('pl' in o && 'en' in o && Object.keys(o).length === 2) return o[I18N.lang];
    for (const k of Object.keys(o)) o[k] = localizeDeep(o[k]);
  }
  return o;
}
/* T('klucz', {name: ...}) -> tekst z podstawionymi {parametrami} */
function T(key, params) {
  const e = STR[key]; let s = e ? (e[I18N.lang] ?? e.pl) : key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split('{' + k + '}').join(v);
  return s;
}

const STR = {
  'log.night': { pl: 'Noc z 30 na 31 października. Al. Szucha 12a.', en: 'The night of 30/31 October 2026. Szucha Avenue 12a, Warsaw.' },
  'log.intro.inside': { pl: 'Trzymasz budynek. Stawiaj kordony i sędziów przy drzwiach (karty na dole, 1–9).', en: 'You hold the building. Place cordons and judges at the doors (cards below, keys 1–9).' },
  'log.intro.outside': { pl: 'Wysyłasz ludzi pod drzwi. Kliknij punkt wejścia na ulicy, potem kartę (1–8).', en: 'You send people to the doors. Click an entry point on the street, then a card (1–8).' },
  'ticker.start': { pl: 'Sędzia Korwin-Piotrowska zarządziła przerwę w czynnościach prezesa. Konto TK na X: „zamach stanu".', en: 'Judge Korwin-Piotrowska suspended the Tribunal\'s president. The Tribunal\'s account on X: "a coup".' },
  'hint.start.inside': { pl: 'Wybierz kartę i kliknij kafel na dziedzińcu.', en: 'Pick a card and click a tile in the courtyard.' },
  'hint.start.outside': { pl: 'Kliknij jeden z punktów wejścia (romby na ulicy), potem kartę.', en: 'Click one of the entry points (diamonds on the street), then a card.' },
  'hint.mobile.inside': { pl: 'Wybierz kartę, potem tapnij kafel dwa razy. Przeciągaj mapę palcem.', en: 'Pick a card, then tap a tile twice. Drag the map with a finger.' },
  'hint.mobile.outside': { pl: 'Punkt wejścia: zachód (romby na ulicy, przeciągnij mapę). Tapnij kartę, żeby wysłać.', en: 'Entry point: west (diamonds on the street; drag the map). Tap a card to send.' },
  'log.presidentUnlocked': { pl: 'Karta PREZYDENT odblokowana.', en: 'PRESIDENT card unlocked.' },
  'log.premierLeaves': { pl: 'Premier schodzi z balkonu.', en: 'The Prime Minister leaves the balcony.' },
  'log.youBuild': { pl: 'Stawiasz: {name}.', en: 'You place: {name}.' },
  'log.aiBuild': { pl: 'Wewnątrz: {name} na dziedzińcu.', en: 'Inside: {name} in the courtyard.' },
  'log.youSend': { pl: 'Wysyłasz: {name}.', en: 'You send: {name}.' },
  'log.summon': { pl: '{side} wzywa: {name}. {quote}', en: '{side} calls in: {name}. {quote}' },
  'log.policeState': { pl: '„Państwo policyjne": kordony przyjmują ×2 przez 15 s.', en: '"Police state": cordons take ×2 damage for 15 s.' },
  'log.freeze': { pl: 'PRZERWA W CZYNNOŚCIACH: wszyscy na zewnątrz zamrożeni na 10 s.', en: 'SUSPENSION OF PROCEEDINGS: everyone outside is frozen for 10 s.' },
  'hint.immunityUsed': { pl: 'Wniosek wobec tej osoby już złożony.', en: 'A motion against this person has already been filed.' },
  'say.immunity': { pl: '50 tomów akt!', en: '50 volumes of files!' },
  'log.immunity': { pl: 'Wniosek o uchylenie immunitetu: {name}.', en: 'Motion to lift immunity: {name}.' },
  'unit.citizen': { pl: 'Obywatel ze skargą', en: 'Citizen with a complaint' },
  'gate.furtka': { pl: 'furtkę', en: 'side gate' }, 'gate.brama': { pl: 'bramę', en: 'main gate' },
  'log.gateForced': { pl: 'Tłum sforsował {gate}.', en: 'The crowd forced the {gate}.' },
  'log.mpCut': { pl: 'Poseł przeciął zabezpieczenie furtki. „Wg Onetu."', en: 'An MP cut the lock on the side gate. "According to Onet."' },
  'float.cut': { pl: 'CIĘCIE', en: 'CUT' }, 'float.entered': { pl: 'wszedł', en: 'got in' }, 'float.escorted': { pl: 'wyprowadzony', en: 'escorted out' },
  'log.presidentIn': { pl: 'PREZYDENT WSZEDŁ DO BUDYNKU. Zdjęcie z wnętrza TK.', en: 'THE PRESIDENT IS INSIDE. A photo from inside the Tribunal.' },
  'log.atDoors': { pl: 'Pod drzwiami było już {n} osób ({max} = „zdjęcie z wnętrza").', en: '{n} people have reached the doors so far ({max} = "photo from inside").' },
  'float.bossRetreats': { pl: 'wycofuje się', en: 'retreats' }, 'float.detained': { pl: 'zatrzymany', en: 'detained' },
  'log.bossRetreats': { pl: '{name} wycofuje się spod Trybunału.', en: '{name} retreats from the Tribunal.' },
  'log.bossOusted': { pl: '{name} został wyparty.', en: '{name} was pushed out.' },
  'float.cordonBroke': { pl: 'kordon się rozstąpił', en: 'cordon gave way' }, 'float.judgeLeft': { pl: 'sędzia się wycofał', en: 'judge stepped back' }, 'float.toppled': { pl: 'przewrócone', en: 'toppled' },
  'log.citizenLost': { pl: 'Obywatel ze skargą konstytucyjną zawraca ({why}). POLSKA −2.', en: 'A citizen with a constitutional complaint turns back ({why}). POLAND −2.' },
  'why.hit': { pl: 'trafiony', en: 'hit' }, 'why.blocked': { pl: 'zablokowany', en: 'blocked' }, 'why.crowd': { pl: 'tłum', en: 'crowd' }, 'why.noise': { pl: 'hałas', en: 'noise' },
  'log.citizenFiled': { pl: 'Obywatel złożył skargę. Ktoś ją kiedyś rozpatrzy. POLSKA +1.', en: 'A citizen filed a complaint. Someone will review it someday. POLAND +1.' },
  'float.filed': { pl: 'skarga złożona', en: 'complaint filed' }, 'float.tweet': { pl: '#TK  POLSKA −1', en: '#TK  POLAND −1' },
  'say.scuffle': { pl: 'przepychanka', en: 'scuffle' }, 'say.leaving': { pl: 'rezygnuję…', en: 'giving up…' },
  'log.bossLeaves': { pl: '{name} schodzi ze sceny.', en: '{name} leaves the stage.' },
  'hint.immunity': { pl: 'Kliknij bossa na mapie.', en: 'Click a boss on the map.' }, 'hint.immunity.mobile': { pl: 'Tapnij bossa na mapie (czerwona obwódka).', en: 'Tap a boss on the map (red outline).' },
  'hint.cardMobile': { pl: '{name}: {desc} Tapnij kafel dwa razy.', en: '{name}: {desc} Tap a tile twice.' },
  'hint.card': { pl: '{name}: kliknij kafel. Prawy przycisk / Esc anuluje.', en: '{name}: click a tile. Right click / Esc cancels.' },
  'hint.noSupportBoss': { pl: 'Za mało poparcia (albo jeszcze nie pora).', en: 'Not enough support (or not the time yet).' },
  'hint.noSupport': { pl: 'Za mało poparcia.', en: 'Not enough support.' },
  'hint.unitGoes': { pl: '{name} rusza z punktu: {spawn}.', en: '{name} sets off from: {spawn}.' },
  'hint.spawn': { pl: 'Punkt wejścia: {spawn}. Teraz karta{keys}.', en: 'Entry point: {spawn}. Now a card{keys}.' },
  'hint.aimBoss': { pl: 'Celuj w bossa (z czerwoną obwódką).', en: 'Aim at a boss (red outline).' },
  'hint.confirmHere': { pl: '{name} tutaj? Tapnij ten kafel jeszcze raz.', en: '{name} here? Tap this tile again.' },
  'hint.cantBuild': { pl: 'Tu nie można: dziedziniec, poza drzwiami; sędzia tylko przy drzwiach.', en: 'Not here: courtyard only, not on doors; judges only next to doors.' },
  'hint.noLegit': { pl: 'Za mało legitymacji.', en: 'Not enough legitimacy.' },
  'hint.placed': { pl: '{name} stoi. Tapnij kolejny kafel albo ✕.', en: '{name} is in place. Tap another tile or ✕.' },
  'ui.lossCount': { pl: 'Polska przegrała na tym komputerze już {n} {times}.', en: 'Poland has already lost {n} {times} on this computer.' },
  'ui.once': { pl: 'raz', en: 'time' }, 'ui.times': { pl: 'razy', en: 'times' },
  'ui.atDoors': { pl: 'pod drzwiami', en: 'at the doors' }, 'ui.doors': { pl: 'drzwi', en: 'doors' },
  'end.winner': { pl: 'Strona, która „wygrała"', en: 'Side that "won"' }, 'end.nobody': { pl: 'nikt — licznik POLSKA spadł do zera', en: 'nobody: the POLAND counter hit zero' },
  'end.time': { pl: 'Godzina zakończenia', en: 'Time it ended' }, 'end.towersUnits': { pl: 'Wieże postawione / jednostki wysłane', en: 'Towers built / units sent' },
  'end.atDoors': { pl: 'Ludzie, którzy dotarli pod drzwi', en: 'People who reached the doors' }, 'end.bosses': { pl: 'Bossowie wezwani', en: 'Bosses called in' },
  'end.citizens': { pl: 'Obywatele, którzy nie złożyli skargi', en: 'Citizens who never filed their complaint' }, 'end.lossCount': { pl: 'Polska przegrała na tym komputerze', en: 'Poland has lost on this computer' },
  'end.polskaZero': { pl: 'POLSKA: 0', en: 'POLAND: 0' },
  'spawn.east': { pl: 'wschód', en: 'east' }, 'spawn.west': { pl: 'zachód', en: 'west' }, 'spawn.south': { pl: 'południe', en: 'south' },
  'loading': { pl: 'Ładowanie assetów…', en: 'Loading assets…' },
  'btn.pause': { pl: '⏸ pauza (spacja)', en: '⏸ pause (space)' }, 'btn.resume': { pl: '▶ dalej (spacja)', en: '▶ resume (space)' },
  'pause.title': { pl: 'PAUZA', en: 'PAUSED' }, 'pause.sub': { pl: 'Czas stoi. Możesz stawiać i wysyłać. Spacja wznawia.', en: 'Time is stopped. You can still place and send. Space resumes.' },
  'hint.doorOnly': { pl: 'Zamknięte drzwi stawia się tylko na kaflu wejścia (głównego lub bocznego).', en: 'Locked doors go only on an entrance tile (main or side).' },
  'hint.judgeMax': { pl: 'Więcej sędziów nie ma (max {n} naraz).', en: 'No more judges available (max {n} at once).' },
  'hint.judgeCooldown': { pl: 'Sędziowie się przegrupowują ({s} s).', en: 'The judges are regrouping ({s} s).' },
  'log.judgeRegroup': { pl: 'Sędzia wypchnięty. Pozostali przegrupowują się przez 25 s.', en: 'A judge was pushed out. The others regroup for 25 s.' },
};

/* Teksty w HTML (data-i18n="klucz"; data-i18n-html="klucz" dla HTML) */
const DOM_STR = {
  'menu.title': { pl: 'STAN WYŻSZEJ<br>KONIECZNOŚCI', en: 'STATE OF HIGHER<br>NECESSITY' },
  'menu.sub': { pl: 'cyfrowy performans o nocy z 30 na 31 października 2026 w Trybunale Konstytucyjnym', en: 'a digital performance about the night of 30/31 October 2026 at Poland\'s Constitutional Tribunal' },
  'menu.choose': { pl: 'Wybierz, kogo bronisz:', en: 'Choose whom you defend:' },
  'menu.inside.title': { pl: 'WEWNĄTRZ', en: 'INSIDE' },
  'menu.inside.desc': { pl: '„Przywracamy praworządność"<br>Trzymasz drzwi Trybunału. Kordony, sędziowie, zarządzenia.', en: '"Restoring the rule of law"<br>You hold the Tribunal\'s doors. Cordons, judges, decrees.' },
  'menu.outside.title': { pl: 'NA ZEWNĄTRZ', en: 'OUTSIDE' },
  'menu.outside.desc': { pl: '„Bronimy porządku konstytucyjnego"<br>Wysyłasz ludzi pod drzwi. Protest, posłowie, Prezydent.', en: '"Defending the constitutional order"<br>You send people to the doors. Protesters, MPs, the President.' },
  'menu.fine': { pl: 'Obie strony twierdzą, że bronią Trybunału. Gra nie rozstrzyga, kto ma rację.<br>Na dole ekranu zawsze jest trzeci licznik. Patrz na niego.', en: 'Both sides claim to be defending the Tribunal. The game does not settle who is right.<br>There is always a third counter at the top. Watch it.' },
  'ending.title': { pl: 'PRZEGRANA: POLSKA', en: 'DEFEAT: POLAND' },
  'ending.other': { pl: 'Zagraj drugą stroną', en: 'Play the other side' },
  'ending.again': { pl: 'Od nowa', en: 'Again' },
  'ending.fine': { pl: 'Każda noc w Trybunale kończy się tak samo, niezależnie od tego, kto wygrał.', en: 'Every night at the Tribunal ends the same way, no matter who won.' },
  'btn.cancel': { pl: '✕ anuluj', en: '✕ cancel' }, 'btn.log': { pl: 'log', en: 'log' }, 'btn.pause': { pl: '⏸ pauza (spacja)', en: '⏸ pause (space)' },
  'loading': { pl: 'Ładowanie assetów…', en: 'Loading assets…' },
  'polska.label': { pl: 'POLSKA', en: 'POLAND' },
};
function applyDomI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { const e = DOM_STR[el.dataset.i18n]; if (e) el.textContent = e[I18N.lang]; });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { const e = DOM_STR[el.dataset.i18nHtml]; if (e) el.innerHTML = e[I18N.lang]; });
  document.querySelectorAll('[data-lang]').forEach(b => { b.classList.toggle('on', b.dataset.lang === I18N.lang); b.addEventListener('click', () => I18N.set(b.dataset.lang)); });
}
document.addEventListener('DOMContentLoaded', applyDomI18n);
