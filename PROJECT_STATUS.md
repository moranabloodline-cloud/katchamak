# PROJECT_STATUS — Kachamak

> **Ažurira se posle SVAKOG završenog zadatka** (pravilo `AGENTS.md` §3.9).
> Čita se na početku sesije, posle `AGENTS.md`, pre bilo kakve izmene.
> **Zadnja izmena:** 2026-11-09 (sesija: raspored view dugmića, dvoredni top
> bar, Label/Status wrap oko teksta).

---

## 1. Šta je ZAVRŠENO (verifikovano u kodu)

Store **v5** · zadnji poznati build: **čist** (09.11.2026, uz Grid zadatak).

| # | Stavka | Gde u kodu |
|---|--------|------------|
| 1 | Donja traka radne površine: Target ikonica skroz levo, word count u sredini (`novelWords`, format „71,257 words"), **Split/Write/Grid/List uz desnu ivicu srednjeg panela** (09.11. po Nikoli) | `NotesSection.tsx` |
| 2 | Everything is a Note — svi tabovi isti note sistem (Codex uključen; migrate v3→v4) | `types.ts`, `store.ts` |
| 3 | Slobodna hijerarhija — novi notes uvek `kind:"doc"`, ime/ikona/boja po korisniku | `types.ts` |
| 4 | Klik na ikonu note → icon picker popup (i preko menija „Change icon") | `NoteTree.tsx` |
| 5 | Tri-dot meni (tačna struktura iz dokumenta) + Move dijalog (izbor bilo kog root-a/note-a za parenta) | `NoteTree.tsx` |
| 6 | **Grid** (zadata 09.11.): Scrivener index kartice (ikona + naslov + Synopsis), papir `#efe6cf` na pluti `#241c12`, caption „GRID · <nivo>", jedan nivo hijerarhije, dupli klik → Write, drag & drop reorder (`destIndex` u `moveNodeTo`), „+ New note" u otvoreni nivo; **store v5** (migracija `view:"grid"`→interno `"corkboard"`) | `Corkboard.tsx` |
| 7 | Ispravke 09.11.: header linije piksel-poravnate (header = panelWidth+1); **mod prikaza se više ne resetuje** (ostaje poslednji aktivan kroz tabove/otvaranje/izlaz) | `NotesSection.tsx`, `store.ts` |
| + | Već postoje: Trash sa restore-om, **top bar u JEDNOJ traci** — Home+Search levo, tabovi Binder/Codex/Planning/Research/Templates/Prompts/Trash u sredini (svi u jednom redu), Tree Scope+Save+Account+Settings desno; **druga traka** = red panela + editor toolbar (levo header stabla, sredina toolbar, desno Info/Details/Mentions); levi panel (stablo, ⓘ popover), desni panel (Label+Status+boja, Synopsis/Notes, NoteMetaBar), resizer-i, app-shell bez skrola stranice (`globals.css`) | `Workspace.tsx`, `PROJEKT-KONTEKST.md` §3 |

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
