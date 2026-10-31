# „Stan wyższej konieczności" — cyfrowy performans o nocy w Trybunale

Data projektu: 2026-10-31. Autor konceptu: Mateusz Pawelczuk + Claude.

## Intencja

Gra o nocy z 30 na 31 października 2026 r. w Trybunale Konstytucyjnym przy al. Szucha.
Każdy gracz może stanąć po jednej ze stron konfliktu. Obie strony twierdzą, że **bronią**
Trybunału i porządku konstytucyjnego. Niezależnie od tego, kto „wygra" mecz, ekran końcowy
jest zawsze ten sam: **PRZEGRANA: POLSKA**.

To nie jest gra, która rozstrzyga, kto ma rację. To performans o tym, że eskalacja ma koszt,
który nie trafia na konto żadnej ze stron, tylko na konto obywateli.

## Fakty, na których opiera się fabuła (stan na 31.10.2026, rano)

- Pt 30.10, ok. 18:00 — sędzia Anna Korwin-Piotrowska (najdłuższy staż) zarządza „przerwę
  w czynnościach" prezesa Bogdana Święczkowskiego i wiceprezesa Bartłomieja Sochańskiego,
  powołując się na „stan wyższej konieczności konstytucyjnej". Konto TK na X: „zamach stanu".
- Wieczorem — prokurator generalny Waldemar Żurek składa 5 wniosków o uchylenie immunitetów
  (4 wobec Święczkowskiego, 1 wobec Sochańskiego), „50 tomów akt".
- ok. 20:17 — pod TK przyjeżdża Święczkowski; protestujący przecinają zabezpieczenie furtki
  (wg Onetu poseł PiS Mariusz Gosek). Policja zatrzymuje 3 osoby za naruszenie miru domowego.
  Piotr Duda („Solidarność") wzywa związkowców pod TK.
- 21:43 — prezydent Karol Nawrocki przerywa lot do Senegalu (misja G20), ląduje w Warszawie.
- tuż przed 1:00 — prezydent z I prezesem SN Zbigniewem Kapińskim wchodzi bocznym wejściem;
  w drzwiach sędziowie (Korwin-Piotrowska, Krystian Markiewicz). Przepychanka.
  Prezydent: „Nie jesteście sędziami". Sędzia Maciej Berek: „nikt Prezydenta nie szarpał".
  Rzecznik Leśkiewicz: „naruszenie nietykalności". Przydacz: „bandyci stosujący przemoc".
- po 2:00 — zdjęcie z wnętrza TK (Kapiński, Nawrocki, Bogucki, Grodecki, Sochański).
- ok. 4:00 — Berek publikuje nagrania. Przed 5:00 prezydent opuszcza budynek.
- 5:53 — ambasador w Rumunii Paweł Soloch rezygnuje. 6:49 — Szefernaker czyta oświadczenie.
- Komentarze: Tusk „przywracanie rządów prawa jest naszym obowiązkiem"; Kaczyński „państwo
  policyjne"; Mentzen „próg zamachu stanu"; Hołownia „naprawianie siłowe dobija pacjenta";
  Matczak „konfrontacja fizyczna to najgłupsza droga"; Zacharowa kpi; ambasador USA
  „bardzo poważne". TSUE (12.2025): polski TK nie jest niezawisłym sądem.
- Skutek dla obywateli: skargi konstytucyjne nierozpatrzone (najstarsze z 2013 r.),
  budżet TK na 2027 nieuchwalony.

## Strony

Gracz wybiera, **kogo broni** (obie opcje są sformułowane jako obrona):

| | WEWNĄTRZ („Przywracamy praworządność") | NA ZEWNĄTRZ („Bronimy porządku konstytucyjnego") |
|---|---|---|
| Rola | tower defense — trzymasz drzwi | strategia — produkujesz jednostki i wysyłasz je pod drzwi |
| Zasób | **Legitymacja** (przyrasta w czasie, + za zablokowanie) | **Poparcie** (przyrasta w czasie, + za dotarcie do drzwi) |
| Cel nominalny | dotrwać do 5:00 | wprowadzić Prezydenta do budynku / 10 przebić |

Strona niekontrolowana przez gracza jest prowadzona przez AI z własnym budżetem.

## Wspólny licznik: POLSKA (100 → 0)

Każde działanie obu stron obniża go: wieża −1, jednostka −1, boss −5…−15, każda sekunda
przepychanki w drzwiach −0.2, każdy stratowany obywatel −2, każdy „komunikat na X" −1.
Gdy POLSKA = 0, mecz się kończy. Balans jest ustawiony tak, że normalna gra zeruje licznik
przed 5:00. Nawet gdy strona osiągnie cel nominalny, ekran zwycięstwa trwa 1,5 s i zostaje
nadpisany przez ekran **PRZEGRANA: POLSKA**.

## Obywatele (jednostka neutralna)

Co kilkadziesiąt sekund z ulicy wychodzi **Obywatel ze skargą konstytucyjną** i idzie do
głównych drzwi. Nikt go nie kontroluje. Jeśli zostanie zablokowany przez kordon, trafiony
pociskiem albo wpadnie w tłum — zawraca. Licznik „Skargi nierozpatrzone" rośnie, POLSKA −2.

## Mapa

Izometryczna siatka 20×20 (kafel 64×32 px), noc, latarnie, koguty radiowozów.
Gmach TK w prawej górnej części z **głównym wejściem** (portyk) i **bocznym wejściem**.
Dziedziniec otoczony ogrodzeniem z **furtką** (można przeciąć) i **bramą**. Ulice od południa
i zachodu — tam punkty wejścia jednostek z zewnątrz. Ścieżki: A* po siatce; kordony i barierki
blokują kafel; jednostki napierają na blokadę (obustronne obrażenia „przepychanki").

## Jednostki i wieże

### WEWNĄTRZ — wieże (stawiane na kaflach dziedzińca / przy drzwiach)
- **Kordon policji** (25) — blokuje kafel, odpycha. Napór tłumu na jedną wieżę jest **ograniczony** (pushCap), więc
  dziesięciu protestujących nie zdejmuje kordonu szybciej niż trzech; gdy nikt nie napiera, kordon się regeneruje.
- **Oddział prewencji** (45) — dwa szeregi z tarczami: 600 HP, większy odrzut, szybsza regeneracja.
- **Barierka** (10) — tania ściana, tłum przewraca ją powoli.
- **Sędzia w drzwiach** (35, tylko kafle przy drzwiach) — aura legitymacji: spowalnia; Prezydent się przez niego „przeciska".
- **Zarządzenie** (30) — biurko z drukarką, strzela paragrafami § na dystans.
- **Komunikat na X** (25) — co kilka sekund fala ogłuszająca tłum; każdy strzał POLSKA −1.
- **Wniosek o immunitet** (60, jednorazowy) — na bossa: „50 tomów akt", ogromne obrażenia.

### WEWNĄTRZ — bossowie (jednorazowi)
- **Prokurator Generalny** (80) — chodzi po dziedzińcu i rzuca teczkami. POLSKA −8.
- **Premier** (80) — staje na balkonie; buff wież + spadek morale tłumu. POLSKA −8.
- **Sędzia najstarsza stażem** (120) — ultimate „Stan wyższej konieczności": 10 s przerwy w czynnościach (wszyscy z zewnątrz zamrożeni). POLSKA −12.

### NA ZEWNĄTRZ — jednostki
- **Protestujący z flagą** (8) — podstawowa.
- **Związkowiec** (15) — tank, wolny.
- **Poseł z nożycami** (25) — przecina ogrodzenie / furtkę.
- **Prawnik z teczką** (20) — odporny na Zarządzenia, „argumentuje" z sędziami.
- **Dziennikarz z kamerą** (12) — bez walki; wieże w zasięgu −50 % („świat patrzy").

### NA ZEWNĄTRZ — bossowie
- **Prezes Trybunału** (50) — aura szybkości; policja nie wpuszcza go dalej niż brama, stoi i buffuje. POLSKA −8.
- **Prezes partii** (50) — „Państwo policyjne": kordony ×2 obrażeń przez 15 s. POLSKA −8.
- **Prezydent** (100, od 0:55) — jedyny, kto przechodzi przez kordon: odporny na ogłuszenie i „przerwę w czynnościach",
  policja odpycha go 4× słabiej, sędziowie tylko spowalniają (przepychanka). Jeśli wejdzie: „Zdjęcie z wnętrza TK". POLSKA −15.

**Zasada drzwi:** zwykłe jednostki nie wchodzą do budynku. Po dotarciu do drzwi dobijają się 3,5 s i zostają
wyprowadzone; licznik „pod drzwiami" (20 = nominalne zwycięstwo zewnątrz). Tłum rozdziela się losowo między furtkę
a bramę (60/40), więc obrona musi trzymać oba wejścia. To odzwierciedla realny przebieg nocy: kordon wytrzymał,
przecięto tylko zabezpieczenie furtki, a do środka weszła dopiero grupa prezydenta.

## Zegar i linia czasu

Czas gry 0:30 → 5:00 w ~6 min realnych. Pasek zdarzeń (ticker) podaje prawdziwe nagłówki
nocy w odpowiednich chwilach (lądowanie, wejście, zdjęcie, nagranie Berka, wyjście, rezygnacja).

## Ekran końcowy

1. 1,5 s: „ZWYCIĘSTWO: WEWNĄTRZ/NA ZEWNĄTRZ" w kolorze strony.
2. Zakłócenie obrazu → „PRZEGRANA: POLSKA" + statystyki: skargi nierozpatrzone, budżet TK
   2027 nieuchwalony, wizyta w Senegalu odwołana, ambasadorowie, którzy zrezygnowali,
   zaufanie do państwa 0 %, „Polska przegrała na tym komputerze już N razy" (localStorage).
3. Przyciski: „Zagraj drugą stroną" / „Od nowa".

## Technologia

- HTML5 Canvas 2D, vanilla JS (klasyczne skrypty, bez bundlera; działa z `file://` i z serwera).
- Pixel art z PixelLab (postacie 8-kierunkowe v3, kafle izometryczne, obiekty), skalowanie ×2 bez wygładzania.
- Assety 3D z dysku (Quaternius) nie pasują do 2D; nieużyte.

## Poza zakresem (na teraz)
Multiplayer, globalna tablica wyników, dźwięk (opcjonalnie), mobile.

## Źródła (stan na 31.10.2026 rano)

- TVN24 — relacja sędziego Macieja Berka z wejścia prezydenta: https://tvn24.pl/polska/karol-nawrocki-wszedl-do-trybunalu-konstytucyjnego-relacja-sedziego-macieja-berka-st9314794
- Rzeczpospolita — relacja na żywo z kryzysu wokół TK: https://www.rp.pl/sady-i-trybunaly/art45424861-chaos-wokol-trybunalu-konstytucyjnego-prezydent-zwoluje-konsultacje-relacja-na-zywo
- Rzeczpospolita — zagraniczne media o sporze: https://www.rp.pl/polityka/art45424941-kryzys-konstytucyjny-w-polsce-spor-o-tk-na-czolowkach-zagranicznych-mediow
- Kaszuby24 — chronologia nocy i stanowiska stron: https://kaszuby24.pl/kryzys-trybunal-konstytucyjny-swieczkowski-nawrocki-co-dalej/
- RMF24 — zawieszenie prezesa, protesty, szarpanina: https://www.rmf24.pl/fakty/polska/news-kryzys-w-trybunale-konstytucyjnym-zawieszenie-prezesa-protes,nIdn,1024182
- Super Express — oskarżenia o zamach stanu: https://www.se.pl/warszawa/prezydent-karol-nawrocki-wkroczyl-w-nocy-do-trybunalu-konstytucyjnego-padly-oskarzenia-o-zamach-stanu-aa-iHrx-eMS3-TZc4.html
- Interia — relacja spod budynku: https://wydarzenia.interia.pl/kraj/na-zywo-chaos-przed-trybunalem-konstytucyjnym-sedziowie-wybrani-prze,nzId,9378
- WP / Politico — „bitwa Tusk–Nawrocki": https://wiadomosci.wp.pl/politico-wskazuje-glownych-aktorow-konfliktu-bitwa-tusk-nawrocki-7345774532258240a
- Forsal — konsultacje prezydenta: https://forsal.pl/kraj/aktualnosci/artykuly/11338941,kryzys-wokol-trybunalu-konstytucyjnego-prezydent-zwolal-pilne-konsultacje-z-udzialem-sil-parlamentarnych.html
- TSUE, komunikat prasowy (12.2025): https://curia.europa.eu/jcms/upload/docs/application/pdf/2025-12/cp250157pl.pdf

Strony sporu relacjonują tę samą noc sprzecznie (czy prezydenta szarpano, czy sędziowie blokowali drzwi).
Gra nie rozstrzyga tych sprzeczności; w logu i na pasku zdarzeń cytuje obie strony.
