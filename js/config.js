/* ============================================================
   KONFIGURACJA GRY — wszystkie liczby i teksty w jednym miejscu.
   ============================================================ */
'use strict';

const CFG = {
  // --- czas ---
  GAME_START_MIN: 30,            // 00:30
  GAME_END_MIN: 300,             // 05:00
  REAL_SECONDS: 360,             // tyle sekund trwa cała noc
  // --- Polska ---
  POLSKA_START: 100,
  POLSKA_COST: {
    tweet: 1, citizenLost: 2, clashPerSec: 0.07,
    fenceCut: 3, breach: 0.5, detained: 0.5,
  },
  // --- ekonomia ---
  ECON: {
    inside:  { start: 90, income: 2.6 },
    outside: { start: 60, income: 3.0 },
  },
  CITIZEN_EVERY: 22,             // s realne
  /* TODO (dla autora): własna reguła, jak Polska traci. Wywoływana co klatkę.
     Przykład: obie strony chomikują zasoby -> apatia -> POLSKA −0.05/s.
     game.money.inside / game.money.outside / game.units / game.towers / game.gameMin są dostępne.
     Zwróć liczbę do odjęcia od licznika POLSKA w tej klatce (0 = nic). */
  customPolskaRule(game, dt) {
    return 0;
  },
  CITIZEN_PATIENCE: 7,           // s bez drogi -> rezygnuje
  OUTSIDE_WIN_BREACHES: 20,          // tylu ludzi pod drzwiami = nominalne zwycięstwo zewnątrz
  DOOR_TIME: 3.5,                    // s dobijania się do drzwi, zanim policja wyprowadzi
};

/* Strony — teksty */
const SIDES = {
  inside: {
    name: 'WEWNĄTRZ',
    slogan: '„Przywracamy praworządność"',
    resource: 'Legitymacja',
    color: '#7c5cff',
    enemy: 'outside',
    victoryText: 'ZWYCIĘSTWO: WEWNĄTRZ<br><small>Dotrwaliśmy do rana. Budynek nasz.</small>',
  },
  outside: {
    name: 'NA ZEWNĄTRZ',
    slogan: '„Bronimy porządku konstytucyjnego"',
    resource: 'Poparcie',
    color: '#ff4d4d',
    enemy: 'inside',
    victoryText: 'ZWYCIĘSTWO: NA ZEWNĄTRZ<br><small>Weszliśmy. Jest zdjęcie z wnętrza TK.</small>',
  },
};

/* ---------- WIEŻE (strona wewnątrz) ---------- */
const TOWERS = {
  barrier: {
    name: 'Barierka', cost: 10, polska: 0.5, hp: 180, kind: 'block', pushCap: 6,
    desc: 'Tania przeszkoda. Tłum przewraca ją powoli.',
    sprite: 'barrier',
  },
  cordon: {
    name: 'Kordon policji', cost: 25, polska: 1, hp: 320, kind: 'block',
    push: 10, range: 1.1, pushCap: 10, regen: 5,
    desc: 'Blokuje kafel, odpycha. Napór tłumu się nasyca, kordon się przegrupowuje.',
    sprite: 'police',
  },
  riot: {
    name: 'Oddział prewencji', cost: 45, polska: 2, hp: 600, kind: 'block',
    push: 14, range: 1.4, pushCap: 12, regen: 8, squad: true,
    desc: 'Dwa szeregi, tarcze. Trzyma linię godzinami.',
    sprite: 'police',
  },
  judge: {
    name: 'Sędzia w drzwiach', cost: 35, polska: 0.8, hp: 160, kind: 'aura', pushCap: 8,
    range: 2.6, slow: 0.5, nearDoor: 2,
    desc: 'Aura legitymacji spowalnia. Tylko przy drzwiach.',
    sprite: 'judge',
  },
  decree: {
    name: 'Zarządzenie', cost: 30, polska: 0.8, hp: 50, kind: 'shoot',
    range: 5.2, dmg: 9, cooldown: 1.1, projectile: '§',
    desc: 'Drukuje paragrafy i strzela nimi na dystans.',
    sprite: 'desk',
  },
  tweet: {
    name: 'Komunikat na X', cost: 25, polska: 0.5, hp: 40, kind: 'stun',
    range: 3.2, cooldown: 4.5, stun: 1.6,
    desc: 'Fala ogłuszająca tłum. Każdy wpis: POLSKA −1.',
    sprite: 'phone',
  },
  immunity: {
    name: 'Wniosek o immunitet', cost: 60, polska: 2, kind: 'target', dmg: 150,
    desc: '„50 tomów akt." Kliknij bossa.',
    sprite: null,
  },
};

/* ---------- BOSSOWIE WEWNĄTRZ ---------- */
const INSIDE_BOSSES = {
  prosecutor: {
    name: 'Prokurator Generalny', cost: 80, polska: 8, hp: 400, speed: 1.4,
    duration: 45, range: 4.2, dmg: 16, cooldown: 1.4,
    desc: 'Chodzi po dziedzińcu i rzuca teczkami.',
    sprite: 'prosecutor', quote: '„Każdy, kto łamie prawo, stanie przed sądem."',
  },
  premier: {
    name: 'Premier', cost: 80, polska: 8, hp: 9999, duration: 35,
    buff: 1.5, enemySlow: 0.8,
    desc: 'Staje na balkonie. Wieże ×1.5, tłum wolniejszy.',
    sprite: 'premier', quote: '„Przywracanie rządów prawa jest naszym obowiązkiem."',
  },
  senior: {
    name: 'Sędzia najstarsza stażem', cost: 120, polska: 12, hp: 200,
    freeze: 10,
    desc: 'ULTIMATE: „stan wyższej konieczności" — 10 s przerwy w czynnościach.',
    sprite: 'judge_senior', quote: '„Stan wyższej konieczności konstytucyjnej."',
  },
};

/* ---------- JEDNOSTKI NA ZEWNĄTRZ ---------- */
const UNITS = {
  protester: {
    name: 'Protestujący', cost: 8, polska: 0.3, hp: 40, speed: 2.2, push: 3,
    desc: 'Flaga, determinacja, niewiele więcej.',
    sprites: ['protester', 'kibic', 'dresiarz'],
  },
  unionist: {
    name: 'Związkowiec', cost: 15, polska: 0.5, hp: 120, speed: 1.4, push: 7,
    desc: 'Wolny, twardy. Piotr Duda wezwał.',
    sprites: ['unionist'],
  },
  mp: {
    name: 'Poseł z nożycami', cost: 25, polska: 1, hp: 70, speed: 1.9, push: 3,
    cutter: true,
    desc: 'Przecina furtkę. „Wg Onetu" to był poseł.',
    sprites: ['mp'],
  },
  lawyer: {
    name: 'Prawnik z teczką', cost: 20, polska: 0.4, hp: 60, speed: 2.0, push: 2,
    immuneDecree: true, argue: 8,
    desc: 'Odporny na zarządzenia. Argumentuje z sędziami.',
    sprites: ['lawyer'],
  },
  journalist: {
    name: 'Dziennikarz', cost: 12, polska: 0.2, hp: 50, speed: 2.0, push: 0,
    dampen: 0.5, dampenRange: 2.8,
    desc: '„Świat patrzy." Wieże obok −50 %.',
    sprites: ['journalist'],
  },
};

/* ---------- BOSSOWIE NA ZEWNĄTRZ ---------- */
const OUTSIDE_BOSSES = {
  tkpresident: {
    name: 'Prezes Trybunału', cost: 50, polska: 8, hp: 500, speed: 1.5, push: 4,
    stopAtGate: true, auraSpeed: 1.35, auraRange: 4, duration: 50,
    desc: 'Staje przy bramie, dodaje tempa. Policja dalej go nie puści.',
    sprites: ['tkpresident'], quote: '„To uzurpacja."',
  },
  chairman: {
    name: 'Prezes partii', cost: 50, polska: 8, hp: 450, speed: 1.1, push: 3,
    policeState: 15, duration: 45,
    desc: '„Państwo policyjne": kordony ×2 obrażeń przez 15 s.',
    sprites: ['chairman'], quote: '„Od dzisiaj Polska staje się państwem policyjnym."',
  },
  president: {
    name: 'Prezydent', cost: 100, polska: 15, hp: 1400, speed: 1.6, push: 0,
    unlockMin: 55, ghost: true, ghostSlow: 0.45, targetDoor: 'side', immuneStun: true, pushResist: 0.25,
    desc: 'Jedyny, kto przechodzi przez kordon. Da się go tylko spowolnić. Celuje w boczne wejście.',
    sprites: ['president'], quote: '„Nie jesteście sędziami."',
  },
};

/* ---------- OBYWATELE (neutralni) ---------- */
const CITIZEN_SPRITES = ['cit_staruszek', 'cit_emerytka', 'cit_matka', 'cit_mloda'];

/* ---------- LINIA CZASU NOCY (minuty gry) ---------- */
const TIMELINE = [
  [30,  'Prezydent wylądował o 21:43 i zawrócił z drogi do Senegalu. Konwój jedzie na Szucha.'],
  [38,  'Komenda Stołeczna: „policja nie weszła do budynku". Kordon stoi przy bramie.'],
  [47,  'Prokurator generalny złożył 5 wniosków o uchylenie immunitetów. 50 tomów akt.'],
  [55,  'Pod TK przyjeżdża I prezes Sądu Najwyższego. Prezydent za chwilę będzie przy bocznym wejściu.'],
  [58,  'Prezydent przy bocznym wejściu. W drzwiach stoją sędziowie.', 'president'],
  [65,  '„Nie jesteście sędziami" — prezydent do sędziów w drzwiach. Przepychanka.'],
  [80,  'Rzecznik prezydenta: sędziowie naruszyli nietykalność głowy państwa.'],
  [95,  'Sędzia Berek: „nikt Prezydenta nie szarpał, ani nikt z Prezydentem się nie szarpał".'],
  [130, 'Zdjęcie z wnętrza TK: Kapiński, Nawrocki, Bogucki, Grodecki, Sochański.'],
  [160, 'Minister Przydacz: zamach stanu grozi karą do 20 lat więzienia.'],
  [195, 'Prof. Matczak: konfrontacja fizyczna to „najgłupsza" droga.'],
  [225, 'Hołownia: naprawianie Trybunału siłą „tylko dobija pacjenta".'],
  [245, 'Sędzia Berek publikuje nagrania z wejścia. „Nie pokazują całości sytuacji."'],
  [290, 'Prezydent opuszcza budynek. Zwołuje pilne konsultacje z siłami parlamentarnymi.'],
  [300, '5:53 — ambasador w Rumunii Paweł Soloch rezygnuje. 6:49 — Szefernaker czyta oświadczenie.'],
];

/* ---------- STATYSTYKI KOŃCOWE ---------- */
const ENDING_FACTS = [
  ['Skargi konstytucyjne nierozpatrzone', (s) => `${s.citizensLost} dziś + zaległe od 2013 r.`],
  ['Budżet Trybunału na 2027', () => 'nieuchwalony'],
  ['Misja do Senegalu (G20)', () => 'odwołana w połowie lotu'],
  ['Ambasadorowie, którzy zrezygnowali', () => '2 (Rumunia, Chiny)'],
  ['Sędziowie, którzy się szarpali', () => 'zależy, kogo spytasz'],
  ['Rzeczniczka MSZ Rosji', () => 'kpi'],
  ['Ambasador USA', () => '„bardzo poważne"'],
  ['TSUE o Trybunale (12.2025)', () => 'nie jest niezawisłym sądem'],
  ['Zaufanie do państwa', () => '0 %'],
];
