# PROJECT_STATUS — Kachamak

> **Ažurira se posle SVAKOG završenog zadatka** (pravilo `AGENTS.md` §3.9).
> Čita se na početku sesije, posle `AGENTS.md`, pre bilo kakve izmene.
> **Zadnja izmena:** 2026-11-09 (sesija: sitnice posle rulera — pozadina reda
> iza lineala vraćena na boju radne površine; brojač na dnu radne površine
> sada pokazuje reči OTVORENE note, zbir romana samo bez selekcije).

---

## 1. Šta je ZAVRŠENO (verifikovano u kodu)

Store **v5** · zadnji poznati build: **čist** (09.11.2026, uz Grid zadatak).

| # | Stavka | Gde u kodu |
|---|--------|------------|
| 1 | Donja traka radne površine: Target ikonica skroz levo, word count u sredini — **reči otvorene note** (`ownWords`: content + Synopsis + Notes, kao u Scriveneru; zbir celog romana `novelWords` samo kad ništa nije selektovano) (ispravka 09.11. po Nikoli — „i dalje ne radi kako treba"), **Split/Write/Grid/List uz desnu ivicu srednjeg panela** | `NotesSection.tsx` |
| 2 | Everything is a Note — svi tabovi isti note sistem (Codex uključen; migrate v3→v4) | `types.ts`, `store.ts` |
| 3 | Slobodna hijerarhija — novi notes uvek `kind:"doc"`, ime/ikona/boja po korisniku | `types.ts` |
| 4 | Klik na ikonu note → icon picker popup (i preko menija „Change icon") | `NoteTree.tsx` |
| 5 | Tri-dot meni (tačna struktura iz dokumenta) + Move dijalog (izbor bilo kog root-a/note-a za parenta) | `NoteTree.tsx` |
| 6 | **Grid** (zadata 09.11.): Scrivener index kartice (ikona + naslov + Synopsis), papir `#efe6cf` na pluti `#241c12`, caption „GRID · <nivo>", jedan nivo hijerarhije, dupli klik → Write, drag & drop reorder (`destIndex` u `moveNodeTo`), „+ New note" u otvoreni nivo; **store v5** (migracija `view:"grid"`→interno `"corkboard"`) | `Corkboard.tsx` |
| 7 | Ispravke 09.11.: header linije piksel-poravnate (header = panelWidth+1); **mod prikaza se više ne resetuje** (ostaje poslednji aktivan kroz tabove/otvaranje/izlaz) | `NotesSection.tsx`, `store.ts` |
| + | Već postoje: Trash sa restore-om, **top bar u JEDNOJ traci (h-10)** — Home+Search levo, tabovi Binder/Codex/Planning/Research/Templates/Prompts/Trash u sredini (svi u jednom redu), Tree Scope+Save+Account+Settings desno; **druga traka (h-10, poravnata)** = header stabla | editor toolbar (jedan red, px-4 kao tabovi) | Info/Details/Mentions tabovi (BEZ ikonica, bez okvira — svetli samo selektovani zlatnom pilulom, po Nikoli); levi panel (stablo, ⓘ popover), desni panel (Label+Status+boja, Synopsis/Notes, NoteMetaBar), resizer-i, app-shell bez skrola stranice (`globals.css`) | `Workspace.tsx`, `NoteTree.tsx`, `WriteArea.tsx`, `RightPanel.tsx`, `PROJEKT-KONTEKST.md` §3 |

## 2. Šta je U TOKU

- **Ništa** — kod je u potvrđenom stanju (Grid + UI polish + raspored dugmića/dvoredni top bar završeni; čeka Nikolino potvrdu).
- Kontinuitet i backup infrastruktura — **ZAVRŠENO 09.11.** (`AGENTS.md`,
  `PROJECT_STATUS.md`, `scripts/backup.sh`, dnevni cron ID 517453 u 03:00,
  sigurnosni fix `.env`; sve verifikovano — vidi §6 i Dnevnik). Ovaj odeljak
  se puni novim započetim zadatkom, a prazni posle svakog završenog.

## 3. Šta je SLEDEĆE (po redu — „ajmo redom")

Tačke 1–6 završene. Sledeća je **tačka 7**:

7. **Inspector reorg** — desni panel u 3 taba: Info (Synopsis + Notes vertikalno,
   draggable razdelnik), Details (povezivanje sa Codex notama, pretraživo),
   Mentions; panel ostaje collapsible.
8. **Toolbar dopune** — postojeći dizajn ostaje; dodati Text Style dropdown
   (podrazumevano „Normal") + dugmad Copy, Delete, Link.
9. **Tabovi — pravila**: obavezni (ne mogu se brisati ni preimenovati): Binder, Codex,
   Trash; brisljivi: Planning, Research, Templates, Prompts; korisnički custom tabovi.
10. **Top bar — „Current Note" dropdown** (ime aktivne note desno u topbaru).
11. **Storage/eksport** — Vault (Markdown fajlovi) + Master Backup_<Project>.json;
    eksport: Importable Master, HTML, Markdown, JSON.
12. **Dashboard** (početni ekran projekta; detalje pitati Nikolu kad dođe na red).

## 4. Otvorena pitanja (pitati Nikolu kad dođe na red)

- Meni u kodu: **„Create note"** vs screenshot: **„Create sub-page"** — koje ime?
- Screenshot menija ima **„Edit permissions"** koju arhitektura dokument ne
  pominje — dodati li je?

## 5. Ključne odluke (hronološki, najnovije dole)

- Naziv mode-a je **„Grid"** — Nikola je eksplicitno zabranio preimenovanje u
  „Corkboard" („NISAM TI DOZVOLIO DA PROMENIŠ Grid u Corkboard"). Interno se
  view zove `corkboard`, korisniku se prikazuje „Grid".
- `KACHAMAK-ARHITEKTURA.md` je autoritativna specifikacija; kad se ona i
  `PROJEKT-KONTEKST.md` razilaze, dokument pobeđuje; Nikolaova trenutna reč
  pobeđuje sve.
- App-shell: `html,body{height:100%;overflow:hidden}` — stranica nikad ne
  skroluje, samo unutrašnji kontejneri (`kachamak-scroll`).
- Mod prikaza (Split/Write/Grid/List) se ne resetuje ni pri kom otvaranju.
- **09.11. — bezbednosna odluka:** `.env` (sadrži `DATABASE_URL`) je bio u git
  indeksu i u oba backup zipa, od kojih jedan stoji u javnom `public/`. Ispravljeno:
  `.env` izbačen iz git indeksa (`.gitignore` već pokriva `.env*`), zipovi
  rebuildovani bez njega, `scripts/backup.sh` ima secrets-guard. Git nema remote,
  pa ništa nije napustilo radni prostor; stara istorija se NE prepravlja.

## 6. Backup & kontinuitet — mehanizmi i status

| # | Mehanizam | Šta štiti | Status |
|---|-----------|-----------|--------|
| 1 | Workspace persistencija (`/home/z/my-project`) | gubitak sesije | uvek aktivan |
| 2 | Git checkpointovi (platforma) + commitovi posle zadataka | prepisivanje koda, istorija | aktivan (zadnji: 09.11 08:02) |
| 3 | `backups/kachamak-<stamp>.zip` — snapshotovi (čuva se 12) | brisanje/korupcija | `scripts/backup.sh` |
| 4 | `download/kachamak-aplikacija.zip` — kopija za Nikolu | prenos izvan radnog prostora | osvežava skript |
| 4b | `download/kachamak-backup-<datum>.zip` — datumovane kopije | istorija za Nikolu | ručno |
| 5 | `public/kachamak-aplikacija.zip` — cloud kopija na preview deploymentu | gubitak celog workspace-a | osvežava skript |
| 6 | **Cron „Kachamak — dnevni backup", 03:00 (Europe/Belgrade)** | zaboravljena ručna kopija | konfigurisan (ID 517453) |

- **Restore postupak:** `PROJEKT-KONTEKST.md` §0 (prvo cloud link, onda
  Nikolaov zip; uvek `bun install && bun run build` posle raspakivanja).
- **Napomena o cloud URL-u:** preview URL se menja sa deploymentom; stari
  (`preview-dev-4f587c…space-z.ai`) vraća 404 od 09.11. Trenutni link vidi
  Nikola u platformi (dodati `/kachamak-aplikacija.zip`); fajl u `public/` je
  uvek svež, pa važeći deployment uvek servira najnoviji backup.
- **Zadnja verifikacija:** 09.11.2026 — snapshot kreiran, `unzip -t` čist,
  restore-drill (raspakivanje u /tmp + `diff -r` naspram workspace-a) čist,
  potvrđeno da `.env` NEMA u zipovima. Dnevni cron: konfigurisan. Nova sesija
  može da rekonstruiše status iz `AGENTS.md` → `PROJEKT-KONTEKST.md` → ovog
  fajla (provereno nezavisnim testom — vidi Dnevnik).

## 7. Dnevnik izmena (najnovije prvo)

- **2026-11-09 (sitnice posle rulera: pozadina iza lineala + brojač reči) — ZAVRŠENO:**
  po Nikolinoj naredbi „u delu iza rulera promenio si boju pozadine, mora da
  bude isto kao i radne površine; a word count i dalje ne radi kako treba":
  (1) **POZADINA IZA LINEALA** — red lineala imao je `bg-background`
  (oklch(0.145) ≈ rgb(10,10,10)), a radna površina je `#0d0d0d` (rgb(13,13,13))
  sa Workspace roota — vidljiva traka drugačijeg tona. Skinut `bg-background`
  (i nepotrebni `sticky`/`z-10` — red je IZNAD skrolera, tekst ne može da
  „curi“ ispod njega); red je sada providan i nasleđuje TAČNU boju radne
  površine. `RulerStrip` (telо lineala) ostaje kako jeste. Piksel-verifikacija:
  iza rulera = rgb(13,13,13) = radna površina, na 1280 i na 1440.
  (2) **BROJAČ REČI** — bio je tehnički ispravan (uživo se menjao, zbir celog
  romana nezavisno potvrđen 61=61), ALI je prikazivao ZBIR ROMANA i dok je
  nota otvorena — zato „i dalje ne radi kako treba“ (u Scriveneru brojač
  pokazuje otvoreni dokument). Sada: kad je nota selektovana pokazuje
  `ownWords(selected)` (content + Synopsis + Notes — isto što i „Words“ u
  Details tabu), zbir celog romana samo kad ništa nije selektovano; tooltip
  „Words in the selected note“ / „Total words in the novel“. Testirano uživo:
  „The third dial waited.“ → „4 words“; +3 otkucane → „7“; prazna Scene 1 →
  „0“; kucanje u Synopsis/Notes se isto uključuje; Home ekran i dalje pokazuje
  ukupni zbir. Test unosi obrisani — store vraćen na originalne podatke.
  Verifikacija: tsc 0 grešaka (src/), build čist, oko lineala radi
  (sakrij/prikaži), donja linija trake 2 y=79: 1440/1440 = 100%, konzola
  bez grešaka.

- **2026-11-09 (zoom po panelu + drag & drop nota na svakom panelu) — ZAVRŠENO:**
  po Nikolinoj naredbi „svaki panel treba da ima svoj zaseban zoom koji radi
  tako što držiš ctrl i skroluješ, a tekstovi unutar se prilagođavaju“ i „notes
  treba da mogu da se drag and drop na svakom panelu... kada se promeni položaj
  može da promeni time i hijerarhiju isto kao što u Scriveneru može“:
  (1) **ZOOM PO PANELU** — nova preferenca u store-u `leftZoom`/`midZoom`/
  `rightZoom` (0.5–2.0, korak 0.1, clamp u `setPanelZoom`, persist u
  localStorage, čita se sa `?? 1` za stare store-ove). Nova komponenta
  `CtrlZoom` u `NotesSection` kači NATIVAN `wheel` listener sa `passive:false`
  na `<aside>`/`<main>` (React onWheel je pasivan — preventDefault, kojim se
  gaši zoom pregledača, ne bi radio); male delte se sabiraju (trackpad) — jedan
  skok točkića = jedan korak. Zoom (CSS `zoom`) važi za SADRŽINU panela, ne i
  za trake: u levom panelu stablo, u srednjem lineal+strana (toolbar/traka 2
  van zooma) i kartice Grid-a i redovi Liste, u desnom sadržina ispod tabova —
  visine traka 2 i donjih traka su NEPROMENJENE pa linije ostaju poravnate.
  `WriteArea`: ruler je prebačen u sticky na vrhu skrolera (isti kontekst
  širine + scrollbar) i stubac teksta je `min(48rem, 100%)` — ruler i tekst su
  poravnati pri SVAKOM zoomu i ni na jednoj širini panela (pre je scrollbar
  pravio ~10px razliku na užim panelima). (2) **DRAG & DROP** — u stablu
  (`NoteTree`): svaki red je draggable; gore 30% reda = „pre“, sredina = „u“
  (postaje sub-strana), dole 30% = „posle“; indikatori — zlatna linija
  iznad/ispod (`#ad7e2e`) i okvir za „u“; drop na prazan prostor stabla = vrh
  sekcije (kraj liste); zabranjeno spuštanje u sopstveno podstablo; računa se
  nad STVARNIM stablom sekcije (radi i kad Tree Scope prikazuje filtrirane
  klonove); srcId putuje kroz ref (dataTransfer se ne čita u dragover).
  U Gridu (`Corkboard`): kartica je podeljena na trećine — leva „pre“, sredina
  „u karticu“ (nest — novi, Scrivener potez), desna „posle“ (postojeći reorder
  sačuvan); indikator za „u“ = zlatni okvir oko cele kartice. U Listi
  (`ListView`): redovi draggable, gore/dole trećine = pre/posle (indeks preko
  nove `locateNode` util-a nad stvarnim stablom), sredina = u notu.
  (3) **next.config.ts: `devIndicators: false`** — Next 16 je počeo da prikazuje
  „N“ devtools dugme u uglu produkcije; ugašeno radi čistog izgleda.
  **Verifikacija u browseru:** zoom levog 1.3 / srednjeg 1.3 / desnog 1.2 →
  screenshot (tekst veći, trake i dalje u istom redu); reload → sve ostalo
  sačuvano; reset Ctrl+skrolom nazad na 1; `defaultPrevented: true` na
  wheel event-u (browser zoom ne skače). DnD testovi sintetskim DragEvent-
  ovima + provera strukture u localStorage: Scene 1 → The Cemetery (nest ✓),
  The Cemetery pre The Tether (reorder ✓), Act 1 na sopstvenu sub-stranu
  ODBIJENO ✓, Chapter 4 na prazan prostor → root Binder-a ✓, Grid: Chapter 5
  na sredinu The Tether kartice → sub-strana ✓, Lista: The third dial waited.
  → Act 3 ✓. `tsc` (src: 0) + `build` čisti; konzola bez grešaka; traka 2
  1440/1440 (100%); brojač reči i dalje 61 (pomeranje ne menja tekst).

- **2026-11-09 (ruler kao u Scriveneru iznad naslova) — ZAVRŠENO:** po Nikolinoj
  naredbi „svaka strana treba da ima ruler kao u Scriveneru iznad naslova koji
  na kraju ima oko da se sakrije ili pojavi ponovo“: (1) **novi `RulerStrip` u
  `WriteArea`** — horizontalni lineal u širini stubca teksta (`max-w-3xl`,
  poravnat tačno sa naslovom i tekstom ispod), sa sitnim podelacima na svakih
  8px, većim na svakih 40px, brojevima iznad velikih podelaka, zasenjenim
  zonama margina (48px levo/desno) i trouglastim markerima margina — izgled
  Scrivener lineala prilagođen tamnoj temi; (2) **oko na kraju lineala**
  (lucide `Eye`/`EyeOff`, smešteno u desnoj margini lineala) ga sakriva i
  ponovo prikazuje — kad je sakriven, ostaje samo oko na istom mestu; (3)
  **nova preferenca `rulerVisible` u store-u** (persist u localStorage; čita
  se sa `?? true` da stari sačuvani store ne bi sakrio lineal posle update-a;
  verzija šeme se NE menja — nema nove migracione grane, šema podataka ista).
  Ruler je na SVAKOJ strani: `WriteArea` je jedini page editor (Split/Write,
  sve sekcije i tabovi); Grid/List ga nemaju jer tamo nema strane. Testirano
  u browseru: The Query → lineal iznad naslova; klik na oko → nestaje, EyeOff
  ostaje; ponovni klik → vraća se; reload → stanje sačuvano (ostao sakriven);
  Scene 1 i Codex tab → lineal tu; 1100px → skuplja se sa stubcem, poravnato.
  `tsc` (src: 0) + `build` čisti; konzola bez grešaka; linija trake 2 i dalje
  100% kontinuirana (piksel-provera 1440/1440 na y=79).

- **2026-11-09 (label iznad prozora + tačan brojač reči) — ZAVRŠENO:** po
  Nikolinoj naredbi: (1) **uklonjen narandžasti natpis vrste** („Act“ /
  „Chapter“ / „Scene“ / „Folder“ / „Note“) iznad naslova u editoru — naslov
  sada počinje direktno na vrhu strane, bez labele koja je kvarila izgled;
  (2) **brojač reči na dnu radne površine sada pokazuje TAČAN broj** — bio je
  bug: `novelWords` je brojao SAMO Binder sekciju i SAMO `content` polje
  (prikazivalo „4 words“ iako je u romanu očigledno više teksta). Sada:
  nova `ownWords(n)` = content + **Synopsis** + **Notes** (sve što je na noti
  napisano), `nodeWords` = ownWords + podstablo, `novelWords` = **sve sekcije**
  („everything is a note“ — Codex/Planning/… se takođe računaju). Usklađeni i
  ostali prikazi da broje isto: ListView kolona „Words“ (list = ownWords,
  kontejner = podstablo) i Details „Words“ u desnom panelu (ownWords).
  **Nezavisna verifikacija u browseru:** izračun iz localStorage podataka =
  **61** (4 scena + 17 Act 1 synopsis + 40 The Query synopsis) = prikazano na
  dnu i na dashboardu („21 scenes · 61 words“). Test uživo: kucanje reči
  61 → 62, brisanje → 61. `tsc` (src: 0) + `build` čisti; linija trake 2 i
  dalje 100% kontinuirana (piksel-provera 1440/1440).

- **2026-11-09 (selekcija preživi prelazak na tab) — ZAVRŠENO:** po Nikolinoj
  prijavi „tekst editor iz druge trake ne treba da nestaje kada nešto nije
  selektovano prelaskom na novi tab; radna površina se ne menja dok se ne
  klikne na levi panel gde biramo novu“: (1) **`setTab` više NE briše
  `selectedNodeId`** (briše samo inline preimenovanje) — prelazak na drugi tab
  ne menja radnu površinu; (2) **nova util `findNodeInNovel(novel, id)`** —
  nota se traži u celom romanu, ne samo u tekućoj sekciji, i vraća njenu
  **matičnu sekciju**; `NotesSection` prosleđuje tu matičnu sekciju
  (`selectedSection`) u WriteArea / RightPanel / NoteMetaBar, pa izmene uvek
  pogađaju sekciju gde nota stvarno živi (ranije bi update na „tuđoj“ noti
  bio tih no-op). Editor toolbar (traka 2) tako ostaje vertikalan kroz sve
  tabove. Grid/List ostaju sekciski pregledi (nivo Grid-a prati selekciju
  samo unutar tekućeg taba). Testirano u browseru: The Query (Binder) →
  prelazak na Codex → editor i desni panel NEIZMENJENI, Codex stablo ništa ne
  ističe; klik na Codex notu „Syntax“ → editor prelazi na nju; izmena naslova
  na Codex tabu → sačuvana u Codex sekciji (stablo pokazuje izmenu); povratak
  na Binder → editor i dalje drži istu notu. `tsc` (src: 0) + `build` čisti;
  piksel-provera donje linije trake 2 i dalje 1440/1440.

- **2026-11-09 (linija trake 2 + dno levog panela) — ZAVRŠENO:** po Nikolinoj
  prijavi „donja linija treba da bude u jednoj ravni od početka do kraja“ i
  „desni hide panel ne treba da bude zalepljen uz ove“: (1) **donja linija
  trake 2 sada ide od leve do desne ivice ekrana bez prekida** — `border-b
  border-white/10` dodat na header stabla (NoteTree) i na Info/Details/Mentions
  red (RightPanel) i na prazno stanje desnog panela; editor toolbar ju je već
  imao; u srednjoj zoni se kad toolbar nije prikazan (Grid / List / bez
  selekcije) crta prazan h-10 red sa istom linijom; zatvoreni paneli dobili
  h-10 red sa border-b u uskoj traci (chevron sada centriran u traci 2).
  **Piksel-verifikovano:** na y=79 svetli 1440/1440 px (i 1100/1100 na užem
  ekranu), u sva četri stanja (Write, Grid, desni zatvoren, levi zatvoren).
  (2) **„Hide panel“ desnog panela skroz desno** u istom redu sa tabovima
  (`ml-auto`; box x=1402, 14px od desne ivice, ista y-visina) — više nije
  zalepljen uz „Mentions“. (3) **Expand all / Collapse all premešteni** iz reda
  ispod headera stabla u **donju traku levog panela**: ⓘ ostaje levo (left
  align), dugmad idu skroz desno u istom redu (ml-auto); red ispod headera
  uklonjen, stablo počinje direktno ispod trake 2; meni „⋯“ zadržava iste
  stavke. Funkcionalnost testirana: Collapse all → 3 vidljiva root-a, Expand
  all → 45 redova. `tsc` (src: 0 grešaka) + `build` čisti.
- **2026-11-09 (poravnanje trake 2 + Info/Details/Mentions tabovi) — ZAVRŠENO:**
  po Nikolinoj prijavi „nisu dve poravnane trake“ + screenshot: (1) **obe trake
  sada h-10 (40px)** — header (Workspace), header stabla (NoteTree, pl-3 da se
  ‹ poravna sa Home), editor toolbar (WriteArea: uklonjen flex-wrap → jedan
  red + horizontalni skrol, px-4 kao tabovi, `[&>*]:shrink-0`), red sa tabovima
  (RightPanel, pl-3.5 kao scope dropdown iznad); (2) **Info/Details/Mentions
  prepravljeni u tabove po Nikoli** — bez ikonica, bez okvira i pozadine kod
  neselektovanih (samo prigušen tekst), selektovani svetli zlatnom pilulom
  (`border-[#ad7e2e]/80 bg-[#3a2c18] text-[#fbe4a6]` — isti aktivni jezik kao
  tabovi u topbaru; dodati `dark:` parnjaci jer dark: varijante iz
  `ui/tabs.tsx` inače pobeđuju). Prazno stanje desnog panela takođe h-10 bez
  kutije. Testirano: klik Info↔Details (svetli prađa selekciju, sadržaj se
  menja), 1440 i 1100px. `tsc`+`build` čisti.
- **2026-11-09 (ISUPRAVKA — top bar vraćen u jednu traku) — ZAVRŠENO:** moja
  prethodna izmena je pogrešno podelila top bar u dve posebne trake (pa je
  sa editor toolbar-om ukupno bilo 3 trake). Nikola poslao screenshot kao
  cilj: **tabovi idu na najvišu traku**, zajedno sa Home+Search levo i
  Scope+Save+Account+Settings desno — sve u jednom redu; **druga traka je
  red panela + editor toolbar** (već postoji: header stabla | Normal/Segoe
  UI/BIUS/align/liste | Info/Details/Mentions). Vraćen header iz commit-a
  `224b376` u jednoredni oblik (novi commit), zadržan `whitespace-nowrap`+
  horizontalni skrol da tabovi nikad ne prelome u dva reda. Ukupno: **2
  trake**. Na Nikolovom screenshotu se vidé i „Chapter 2 - The Tether“
  dropdown umesto Tree Scope (= tačka 10, Current Note) i „Normal“+copy/
  delete/link u toolbaru (= tačka 8) — NIJE rađeno bez njegove reči, čeka
  red (“ajmo redom”).
- **2026-11-09 (Label i Status — wrap oko teksta) — ZAVRŠENO:** po Nikolinoj
  naredbi u `NoteMetaBar` (dno desnog panela): Label input više nije `flex-1`
  (razvlačio se preko celog panela) ni Status fiksiran na 110px — sada **oba
  „wrap“ oko svog teksta** (Label: `size` po broju znakova, min 8 = dužina
  „No Label“; Status: `w-fit` iz baze, bez fiksne širine) i stoje **uz levu
  ivicu desnog panela**, prazno desno kad je panel širok. Na uzom panelu se
  oba proporcionalno skupljaju i čisto seku (`overflow-hidden` na traci) —
  po Nikolinoj reči „izgubiće se“ ako se panel suzi. Boja-dot ostaje odmah
  iza. Testirano u browseru: kucan dug label (raste sa tekstom), sužen i
  raširen panel, label vraćen na prazno. `tsc`+`build` čisti; store/schema
  netaknuti (samo klase + `size` atribut).
- **2026-11-09 (raspored dugmića + dvoredni top bar) — ZAVRŠENO:** po Nikolinoj
  naredbi dve izmene rasporeda, bez diranja funkcionalnosti i podataka:
  (1) **Split/Write/Grid/List premešteni** — bili su u donjoj traci levog panela
  (uz njenu desnu ivicu), sada stoje **uz desnu ivicu srednjeg panela radne
  površine, skroz na donjoj traci** (`absolute right-2`, pa word count ostaje
  tačno u sredini); ⓘ u levom panelu ostaje na svom mestu; (2) **top bar sada
  ima dve trake** — traka 1: Home+Search (zona levog panela) i Tree Scope +
  Save + Account + Settings (zona desnog panela), sredina prazna; traka 2:
  **svih 7 tabova u jednom redu**, poravnato sa radnom površinom; vertikalne
  linije panela produžene kroz obe trake (zone `panelWidth+1` u obe), tabovi
  `whitespace-nowrap` + horizontalni skrol samo ako prozor bude suviše uzan —
  nikad se ne lome u dva reda. Oba reda `h-10` (40px, na 4/8 skali).
  Verifikacija: `tsc` + `build` čisti; screenshotovi 1440/1366/1100px + klik
  test Grid/Split iz nove pozicije (radi). Store/schema: netaknuti.
- **2026-11-09 (UI polish prolaz) — ZAVRŠENO:** Finalni vizuelni prolaz bez
  redizajna — samo className izmene u 10 komponenti: (1) **selekcija u zlatnoj
  boji** — NoteTree red i ListView red su bili ZELENI (green-500), sada
  `amber-400/10` (+ border `amber-400/40` u stablu) u skladu sa sistemom
  „zlato za aktivno/selektovano“; (2) **uniformne ikonice** — ⓘ u donjoj traci
  18px → 16px (`h-4 w-4`), Settings u topbaru (skupljena traka) 16px → 20px
  kao ostale u topbaru; (3) **border konsistencija** — Tree Scope dropdown
  `white/20` → `white/15` (par sa search poljem, `--input` token), focus
  filtera u Trash-u `orange-500/50` → `amber-500/50` (isti fokus jezik kao
  search); (4) **mikro-interakcije** — `transition-colors` dodat na ~40
  interaktivnih elemenata (redovi, ikonice-dugmad, pilule, meni-tačke,
  pickeri, dugmad dijaloša, „+ New note“ kartica, Restore/Delete); radii i
  spacing već bili na koherentnoj skali (tokeni `--radius`, 4/8 baza sa 2px
  mikro-koracima) — netaknuti; Scrivener kartice namerno `rounded-[3px]`.
  Verifikacija: `tsc` + `build` čisti; izračunato potvrđene boje selekcije
  (amber/10+/40), veličine ikonica (16/20px) i tranzicije; screenshotovi
  pre/posle u `scripts/polish/` (home, workspace, grid, list, write) —
  raspored neizmenjen, editor i dalje dominantan. Funkcionalnost i podaci
  netaknuti (samo klase).
- **2026-11-09 (kontinuitet/backup sesija) — ZAVRŠENO:** Kreirani `AGENTS.md`
  (stalna pravila + obavezan redosled čitanja) i `PROJECT_STATUS.md` (ovaj
  fajl); napisan `scripts/backup.sh` (snapshot + secrets-guard + download/public
  kopije + rotacija 12 + git commit); konfigurisan dnevni cron 03:00
  Europe/Belgrade (ID 517453); **sigurnosni fix:** `.env` (sadrži
  `DATABASE_URL`) izbačen iz git indeksa i iz oba zipa — zipovi rebuildovani,
  sve tri kopije identične (MD5 proveren). Verifikacija: snapshot
  `backups/kachamak-2026-11-09_094037.zip` (4,7M), `unzip -t` čist,
  restore-drill u /tmp čist (133 fajla, diff bez razlike u izvornom kodu), i
  nezavisni test „nove sesije" prošao — nova sesija je iz dokumenata
  rekonstruisala projekat, status, sledeći zadatak (tačku 7), restore postupak
  i pravila. Aplikativni kod NIJE diran.
- **2026-11-09 ~08:02 (prethodni deo sesije, commit `9457ee5`):** Ispravka po
  Nikolinoj prijavi — naziv mode-a vraćen na **„Grid"** (zabrana preimenovanja
  u „Corkboard"); checkpoint commit platforme.
