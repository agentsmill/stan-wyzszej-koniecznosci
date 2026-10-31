/* ============================================================
   KONFIGURACJA GRY — liczby i teksty (pl/en) w jednym miejscu.
   Pola {pl, en} są spłaszczane do bieżącego języka na końcu pliku.
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
  OUTSIDE_WIN_BREACHES: 20,      // tylu ludzi pod drzwiami = nominalne zwycięstwo zewnątrz
  DOOR_TIME: 3.5,                // s dobijania się do drzwi, zanim policja wyprowadzi
};

const B = (pl, en) => ({ pl, en });

/* Strony — teksty */
const SIDES = {
  inside: {
    name: B('WEWNĄTRZ', 'INSIDE'),
    slogan: B('„Przywracamy praworządność"', '"Restoring the rule of law"'),
    resource: B('Legitymacja', 'Legitimacy'),
    color: '#7c5cff',
    enemy: 'outside',
    victoryText: B('ZWYCIĘSTWO: WEWNĄTRZ<br><small>Dotrwaliśmy do rana. Budynek nasz.</small>', 'VICTORY: INSIDE<br><small>We made it to morning. The building is ours.</small>'),
  },
  outside: {
    name: B('NA ZEWNĄTRZ', 'OUTSIDE'),
    slogan: B('„Bronimy porządku konstytucyjnego"', '"Defending the constitutional order"'),
    resource: B('Poparcie', 'Support'),
    color: '#ff4d4d',
    enemy: 'inside',
    victoryText: B('ZWYCIĘSTWO: NA ZEWNĄTRZ<br><small>Weszliśmy. Jest zdjęcie z wnętrza TK.</small>', 'VICTORY: OUTSIDE<br><small>We got in. There is a photo from inside the Tribunal.</small>'),
  },
};

/* ---------- WIEŻE (strona wewnątrz) ---------- */
const TOWERS = {
  barrier: {
    name: B('Barierka', 'Barrier'), cost: 10, polska: 0.5, hp: 180, kind: 'block', pushCap: 6,
    desc: B('Tania przeszkoda. Tłum przewraca ją powoli.', 'Cheap obstacle. The crowd topples it slowly.'),
    sprite: 'barrier',
  },
  cordon: {
    name: B('Kordon policji', 'Police cordon'), cost: 25, polska: 1, hp: 320, kind: 'block',
    push: 10, range: 1.1, pushCap: 10, regen: 5,
    desc: B('Blokuje kafel, odpycha. Napór tłumu się nasyca, kordon się przegrupowuje.', 'Blocks a tile, pushes back. Crowd pressure saturates; the cordon regroups.'),
    sprite: 'police',
  },
  riot: {
    name: B('Oddział prewencji', 'Riot squad'), cost: 45, polska: 2, hp: 600, kind: 'block',
    push: 14, range: 1.4, pushCap: 12, regen: 8, squad: true,
    desc: B('Dwa szeregi, tarcze. Trzyma linię godzinami.', 'Two ranks, shields. Holds the line for hours.'),
    sprite: 'police',
  },
  judge: {
    name: B('Sędzia w drzwiach', 'Judge in the doorway'), cost: 35, polska: 0.8, hp: 160, kind: 'aura', pushCap: 8,
    range: 2.6, slow: 0.5, nearDoor: 2,
    desc: B('Aura legitymacji spowalnia. Tylko przy drzwiach.', 'An aura of legitimacy slows the crowd. Doors only.'),
    sprite: 'judge',
  },
  decree: {
    name: B('Zarządzenie', 'Decree'), cost: 30, polska: 0.8, hp: 50, kind: 'shoot',
    range: 5.2, dmg: 9, cooldown: 1.1, projectile: '§',
    desc: B('Drukuje paragrafy i strzela nimi na dystans.', 'Prints paragraphs and fires them at range.'),
    sprite: 'desk',
  },
  tweet: {
    name: B('Komunikat na X', 'Post on X'), cost: 25, polska: 0.5, hp: 40, kind: 'stun',
    range: 3.2, cooldown: 4.5, stun: 1.6,
    desc: B('Fala ogłuszająca tłum. Każdy wpis: POLSKA −1.', 'A shockwave that stuns the crowd. Every post: POLAND −1.'),
    sprite: 'phone',
  },
  immunity: {
    name: B('Wniosek o immunitet', 'Immunity motion'), cost: 60, polska: 2, kind: 'target', dmg: 150,
    desc: B('„50 tomów akt." Kliknij bossa.', '"50 volumes of files." Click a boss.'),
    sprite: null,
  },
};

/* ---------- BOSSOWIE WEWNĄTRZ ---------- */
const INSIDE_BOSSES = {
  prosecutor: {
    name: B('Prokurator Generalny', 'Prosecutor General'), cost: 80, polska: 8, hp: 400, speed: 1.4,
    duration: 45, range: 4.2, dmg: 16, cooldown: 1.4,
    desc: B('Chodzi po dziedzińcu i rzuca teczkami.', 'Patrols the courtyard throwing case files.'),
    sprite: 'prosecutor', quote: B('„Każdy, kto łamie prawo, stanie przed sądem."', '"Whoever breaks the law will face the court."'),
  },
  premier: {
    name: B('Premier', 'Prime Minister'), cost: 80, polska: 8, hp: 9999, duration: 35,
    buff: 1.5, enemySlow: 0.8,
    desc: B('Staje na balkonie. Wieże ×1.5, tłum wolniejszy.', 'Takes the balcony. Towers ×1.5, crowd slower.'),
    sprite: 'premier', quote: B('„Przywracanie rządów prawa jest naszym obowiązkiem."', '"Restoring the rule of law is our duty."'),
  },
  senior: {
    name: B('Sędzia najstarsza stażem', 'Most senior judge'), cost: 120, polska: 12, hp: 200,
    freeze: 10,
    desc: B('ULTIMATE: „stan wyższej konieczności" — 10 s przerwy w czynnościach.', 'ULTIMATE: "state of higher necessity": a 10 s suspension of proceedings.'),
    sprite: 'judge_senior', quote: B('„Stan wyższej konieczności konstytucyjnej."', '"A state of constitutional higher necessity."'),
  },
};

/* ---------- JEDNOSTKI NA ZEWNĄTRZ ---------- */
const UNITS = {
  protester: {
    name: B('Protestujący', 'Protester'), cost: 8, polska: 0.3, hp: 40, speed: 2.2, push: 3,
    desc: B('Flaga, determinacja, niewiele więcej.', 'A flag, determination, not much else.'),
    sprites: ['protester', 'kibic', 'dresiarz'],
  },
  unionist: {
    name: B('Związkowiec', 'Union member'), cost: 15, polska: 0.5, hp: 120, speed: 1.4, push: 7,
    desc: B('Wolny, twardy. Piotr Duda wezwał.', 'Slow, tough. Piotr Duda called them in.'),
    sprites: ['unionist'],
  },
  mp: {
    name: B('Poseł z nożycami', 'MP with bolt cutters'), cost: 25, polska: 1, hp: 70, speed: 1.9, push: 3,
    cutter: true,
    desc: B('Przecina furtkę. „Wg Onetu" to był poseł.', 'Cuts the side gate. "According to Onet" it was an MP.'),
    sprites: ['mp'],
  },
  lawyer: {
    name: B('Prawnik z teczką', 'Lawyer with a briefcase'), cost: 20, polska: 0.4, hp: 60, speed: 2.0, push: 2,
    immuneDecree: true, argue: 8,
    desc: B('Odporny na zarządzenia. Argumentuje z sędziami.', 'Immune to decrees. Argues with the judges.'),
    sprites: ['lawyer'],
  },
  journalist: {
    name: B('Dziennikarz', 'Journalist'), cost: 12, polska: 0.2, hp: 50, speed: 2.0, push: 0,
    dampen: 0.5, dampenRange: 2.8,
    desc: B('„Świat patrzy." Wieże obok −50 %.', '"The world is watching." Nearby towers −50%.'),
    sprites: ['journalist'],
  },
};

/* ---------- BOSSOWIE NA ZEWNĄTRZ ---------- */
const OUTSIDE_BOSSES = {
  tkpresident: {
    name: B('Prezes Trybunału', 'Tribunal President'), cost: 50, polska: 8, hp: 500, speed: 1.5, push: 4,
    stopAtGate: true, auraSpeed: 1.35, auraRange: 4, duration: 50,
    desc: B('Staje przy bramie, dodaje tempa. Policja dalej go nie puści.', 'Stands at the gate, speeds the crowd up. The police will not let him further.'),
    sprites: ['tkpresident'], quote: B('„To uzurpacja."', '"This is usurpation."'),
  },
  chairman: {
    name: B('Prezes partii', 'Party chairman'), cost: 50, polska: 8, hp: 450, speed: 1.1, push: 3,
    policeState: 15, duration: 45,
    desc: B('„Państwo policyjne": kordony ×2 obrażeń przez 15 s.', '"Police state": cordons take ×2 damage for 15 s.'),
    sprites: ['chairman'], quote: B('„Od dzisiaj Polska staje się państwem policyjnym."', '"From today Poland becomes a police state."'),
  },
  president: {
    name: B('Prezydent', 'The President'), cost: 100, polska: 15, hp: 1400, speed: 1.6, push: 0,
    unlockMin: 55, ghost: true, ghostSlow: 0.45, targetDoor: 'side', immuneStun: true, pushResist: 0.25,
    desc: B('Jedyny, kto przechodzi przez kordon. Da się go tylko spowolnić. Celuje w boczne wejście.', 'The only one who walks through the cordon. Can only be slowed. Heads for the side entrance.'),
    sprites: ['president'], quote: B('„Nie jesteście sędziami."', '"You are not judges."'),
  },
};

/* ---------- OBYWATELE (neutralni) ---------- */
const CITIZEN_SPRITES = ['cit_staruszek', 'cit_emerytka', 'cit_matka', 'cit_mloda'];

/* ---------- LINIA CZASU NOCY (minuty gry) ---------- */
const TIMELINE = [
  [30,  B('Prezydent wylądował o 21:43 i zawrócił z drogi do Senegalu. Konwój jedzie na Szucha.', 'The President landed at 21:43, turning back from a flight to Senegal. The motorcade heads to Szucha Avenue.')],
  [38,  B('Komenda Stołeczna: „policja nie weszła do budynku". Kordon stoi przy bramie.', 'Warsaw police HQ: "the police did not enter the building." A cordon stands at the gate.')],
  [47,  B('Prokurator generalny złożył 5 wniosków o uchylenie immunitetów. 50 tomów akt.', 'The Prosecutor General filed 5 motions to lift immunities. 50 volumes of files.')],
  [55,  B('Pod TK przyjeżdża I prezes Sądu Najwyższego. Prezydent za chwilę będzie przy bocznym wejściu.', 'The First President of the Supreme Court arrives. The President will be at the side entrance any moment.')],
  [58,  B('Prezydent przy bocznym wejściu. W drzwiach stoją sędziowie.', 'The President at the side entrance. Judges stand in the doorway.'), 'president'],
  [65,  B('„Nie jesteście sędziami" — prezydent do sędziów w drzwiach. Przepychanka.', '"You are not judges," the President tells the judges in the doorway. A scuffle.')],
  [80,  B('Rzecznik prezydenta: sędziowie naruszyli nietykalność głowy państwa.', 'Presidential spokesman: the judges violated the inviolability of the head of state.')],
  [95,  B('Sędzia Berek: „nikt Prezydenta nie szarpał, ani nikt z Prezydentem się nie szarpał".', 'Judge Berek: "nobody jostled the President, nor did the President jostle anyone."')],
  [130, B('Zdjęcie z wnętrza TK: Kapiński, Nawrocki, Bogucki, Grodecki, Sochański.', 'A photo from inside the Tribunal: Kapiński, Nawrocki, Bogucki, Grodecki, Sochański.')],
  [160, B('Minister Przydacz: zamach stanu grozi karą do 20 lat więzienia.', 'Minister Przydacz: a coup carries up to 20 years in prison.')],
  [195, B('Prof. Matczak: konfrontacja fizyczna to „najgłupsza" droga.', 'Prof. Matczak: physical confrontation is "the dumbest" road.')],
  [225, B('Hołownia: naprawianie Trybunału siłą „tylko dobija pacjenta".', 'Hołownia: fixing the Tribunal by force "only finishes off the patient."')],
  [245, B('Sędzia Berek publikuje nagrania z wejścia. „Nie pokazują całości sytuacji."', 'Judge Berek posts footage of the entry. "It does not show the whole situation."')],
  [290, B('Prezydent opuszcza budynek. Zwołuje pilne konsultacje z siłami parlamentarnymi.', 'The President leaves the building and calls urgent consultations with parliamentary forces.')],
  [300, B('5:53 — ambasador w Rumunii Paweł Soloch rezygnuje. 6:49 — Szefernaker czyta oświadczenie.', '5:53: ambassador to Romania Paweł Soloch resigns. 6:49: Szefernaker reads the statement.')],
];

/* ---------- STATYSTYKI KOŃCOWE ({n} = obywatele, którzy zawrócili) ---------- */
const ENDING_FACTS = [
  [B('Skargi konstytucyjne nierozpatrzone', 'Constitutional complaints left unreviewed'), B('{n} dziś + zaległe od 2013 r.', '{n} today + a backlog since 2013')],
  [B('Budżet Trybunału na 2027', 'Tribunal budget for 2027'), B('nieuchwalony', 'not adopted')],
  [B('Misja do Senegalu (G20)', 'Mission to Senegal (G20)'), B('odwołana w połowie lotu', 'aborted mid-flight')],
  [B('Ambasadorowie, którzy zrezygnowali', 'Ambassadors who resigned'), B('2 (Rumunia, Chiny)', '2 (Romania, China)')],
  [B('Sędziowie, którzy się szarpali', 'Judges who jostled'), B('zależy, kogo spytasz', 'depends who you ask')],
  [B('Rzeczniczka MSZ Rosji', 'Russian MFA spokeswoman'), B('kpi', 'mocking')],
  [B('Ambasador USA', 'US Ambassador'), B('„bardzo poważne"', '"very serious"')],
  [B('TSUE o Trybunale (12.2025)', 'CJEU on the Tribunal (12.2025)'), B('nie jest niezawisłym sądem', 'not an independent court')],
  [B('Zaufanie do państwa', 'Trust in the state'), B('0 %', '0 %')],
];

/* spłaszczenie {pl, en} -> bieżący język */
for (const o of [SIDES, TOWERS, INSIDE_BOSSES, UNITS, OUTSIDE_BOSSES, TIMELINE, ENDING_FACTS]) localizeDeep(o);
