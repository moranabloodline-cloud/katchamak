# PROJECT_STATUS — Kachamak

> **2026-11-10 — Dashboard:** dugmad Project, Import i Account povezana su sa postojećim funkcijama; pretraga filtrira projekte po naslovu i autoru. Provereni su kreiranje i otvaranje projekta, čuvanje posle osvežavanja, pretraga, dijalog naloga, uvoz ispravnog i odbijanje neispravnog JSON-a. Build i TypeScript provera aplikacije prošli su na GitHub Actions. Collection, Sort, Group i Grid/List ostaju nedovršeni.

> **Ažurira se posle SVAKOG završenog zadatka** (pravilo `AGENTS.md` §3.9).
> Čita se na početku sesije, posle `AGENTS.md`, pre bilo kakve izmene.
> **Preuzimanje u ChatGPT:** 2026-11-10 — nova osnova je GitHub commit `cbf05c1a6a4e6dd80bb9eb50ff6b78568970b33f`. Dashboard i editor otvoreni i provereni; dodat samo sloj za pokretanje i objavu kroz Sites.
>
> **Prethodna izmena:** 2026-11-10 (sesija: **Dashboard — ispravka proporcija**
> — donji deo po referenci: sidebar ~19% širine, skoro-crna pozadina
> #0a0c10 umesto toplo braon, krupniji toolbar (h-11) i pretraga 310px,
> Grid/List zlatni segmented skroz desno, kartice 230px sa coverom ~44%
> širine i krupnijom tipografijom. Banner, funkcije, Workspace i podaci
> NIJE diran — samo klasa boje gradijenta ispod bannera (bez šava).

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
| 8 | **Split (09.11., kao u Scriveneru; dve ispravke istog dana)**: formatna traka (traka 2) je JEDNA fiksna instanta iznad svega — NE duplira se po panelu; **lenjir je u SVAKOJ radnoj površini** (RulerRow + strana u zajedničkom zoom omotu panela) i **svaka površina ima SVOJ odvojeni zoom** (`paneAZoom`/`paneBZoom`, Ctrl+skrol nad tom površinom, `stopPropagation` da ne dira midZoom; null → nasleđuje midZoom); deli se radna površina: dva identična editora (EditorPage) + razdelnik (0.2–0.8, persist), klik na površinu je bira (zlatna 2px linija na vrhu), klik na notu otvara SAMO u izabranoj — druga ostaje; prvi ulazak klonira otvorenu notu u oba; inspector/brojač/highlight prate fokusiranu; font/veličina/prored u store-u (`editorFont/Size/Spacing`) — zajednički za traku i sve strane; brisanje/prazni/nova nota/promena romana sve pokriveno | `SplitEditors.tsx`, `WriteArea.tsx`, `CtrlZoom.tsx`, `NotesSection.tsx`, `store.ts` |
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

- **2026-11-10 (GitHub verzija preneta u ChatGPT) — ZAVRŠENO:** po Nikolinoj naredbi stari Sites frontend/worker/testovi zamenjeni kodom iz privatnog repozitorijuma `moranabloodline-cloud/katchamak`, osnova `cbf05c1a6a4e6dd80bb9eb50ff6b78568970b33f`. Sačuvan identitet postojeće aplikacije i njen pristup; GitHub istorija i izvorni upload materijali ostaju netaknuti. Dodati `scripts/preview-next.mjs` (prihvata host/port iz ChatGPT pregleda), `scripts/build-project.mjs` (standardni standalone build van Sites-a; statički export i Worker pakovanje uz hosting manifest), `scripts/package-sites.mjs` i `scripts/sites-runtime.mjs` (serviranje identičnog Next builda i postojeći `open_novel_studio` alat). Google fontovi koriste sistemske TLS sertifikate; Prisma klijent generisan prilikom instalacije. Bez promena izgleda, store-a, migracija ili funkcija editora. `bun run build` prošao, Sites build prošao (47 resursa), MCP smoke provera prošla; `bunx tsc --noEmit` ima samo dve postojeće greške u websocket primerima (socket.io paketi), bez grešaka u `src/`. U browseru provereni dashboard → projekat → beleška i editor. Dalji rad nastavlja se na ovoj GitHub osnovi.

- **2026-11-10 (Dashboard — ispravka proporcija) — ZAVRŠENO:** Nikola uporedio
  fazu 1 sa referencom i tražio ispravke SAMO donjeg dela. Izmereno sa
  reference (piksel-analiza, referenca 1672px vs ekran 1920px → sve ×1.148):
  sidebar `w-[280px]` → **`w-[19%]`** (min 230px); pozadina donjeg dela
  `#17110b` → **`#0a0c10`** + sidebar `#090b0f` (referenca je skoro-crna,
  ne toplo-braon — boje merene: #080b0f/#0b0c0e); header stabla krupniji
  (serif 19px, folder 24px, + dugme 40x40, separator linija ispod);
  „All Projects“ serif **30px** + ikona 32px; toolbar **h-11** dugmad (text-
  base, ikone 20px), pretraga **310px**, Sort/Group u desnoj grupi,
  **Grid/List zlatni segmented** (aktivni zlatni fill + tamna ikona, zlatni
  obrub, 52px segmenti) **skroz desno**; kartice **h-230px** (ref ~200px na
  1672 → ×1.148), cover **44%** širine (min 160/max 250) sa zlatnim
  separatorom, naslov **serif 24px bijel**, redovi **16px** skoro-bijeli
  (#d4d1c9) sa zlatnim ikonama 20px, zlatni obrub #a97f33/60 + hover
  #f0b018. JEDINA izmena iznad bannera: donji gradijent prelaza
  `from-[#17110b]` → `from-[#0a0c10]` (da nema šava prema novoj pozadini —
  banner slika netaknuta). Bez izmišljenih kolekcija/projekata — i dalje
  „No collections yet.“ + postojeća 2 projekta. **Turbopack/Tailwind v4 dev
  keš podmukao:** nove Tailwind klase nisu ulazile u CSS ni posle restarta
  dev servera (DOM imao klasu, CSS pravilo nedostajalo, kartice 170px);
  rešeno **`rm -rf .next`** + restart — zapisati ako se ponovi. Verifikacija:
  navigacija kartica→Workspace→„Back to dashboard“ radi, konzola bez
  grešaka; `tsc` čist (samo 3 poznate greške u examples/ i skills/);
  `build` čist; screenshot 1920x1080 + side-by-side poređenje sa referencom
  u `/tmp/render/compare-final.png` (proporcije poklapaju se).
- **2026-11-10 (Dashboard — faza 1) — ZAVRŠENO:** po Nikolinoj referenci
  (screenshot) napravljen Dashboard kao **početni ekran**. NOVO:
  `src/components/kachamak/Dashboard.tsx`; `page.tsx` renderuje Dashboard
  umesto starog Home kad nema aktivnog romana (**Home.tsx ostaje netaknut u
  kodu** — stari kod se ne briše pre Nikolinet potvrde). **Gornji deo:** top
  bar (Feather + „KATCHAMAK“ serif zlatno levo; Help i Account desno — samo
  vizuelno), naslov „My Collections“ (serif) + podnaslov, **dekorativni
  statični banner** — AI slika `public/dashboard-banner.png` (2880x640,
  generisan `scripts/dashboard/gen_banner_wide.ts`; pet kartica Books/Games/
  Software/Movies/Cartoons sa tačnim pluralom, planine levo i dvorac desno do
  ivica; JEDNA slika, bez kartica/komponenti/funkcionalnosti). **Donji deo:**
  levo stablo Collections (faza 1 prazno — „No collections yet.“, bez demo
  podataka; kod za hijerarhiju/izbor spreman za fazu 2), desno „All Projects“
  + toolbar: + Collection i + Project (zlatne), Import (outline), Search,
  Sort, Group, Grid/List toggle — **svi samo vizuelno** (Nikolina tačka 4).
  Projekti = postojeći romani (sort po updatedAt), **horizontalne kartice**:
  cover levo (postojeći `n.cover.bg`+`icon` — podaci netaknuti), desno naslov
  serif, „Novel“, broj reči (`novelWords`), „Modified X“ (`relativeTime`
  helper u komponenti), ⋮ vizuelno. **Minimalna funkcionalnost radi:** klik na
  karticu = `openNovel` → Workspace; postojeće „Back to dashboard“ dugme
  (`closeNovel`) vraća na Dashboard. Store/schema/migracije NIJE diran;
  Workspace/editor netaknuti. Verifikacija: `build` + `tsc` čisti; konzola
  bez grešaka; screenshotovi 1440x900 (hero ~438px ≈ referenca, donji deo
  staje bez skrola) i 1366x768 u `scripts/dashboard/`. Banner iteriran: v1
  1440x704 (singular „project“ na 2 kartice) → ogledalo-extend neispravan
  (odražavao kartice) → usvojen wide 2880x640 (tačni tekstovi, pejzaž do
  ivica).
- **2026-11-10 (trajna GitHub veza — merge + push cele istorije) — ZAVRŠENO:**
  Nikola napravio fine-grained PAT (samo repo `katchamak`, Contents: Read and
  write) i poslao ga u chatu. Token upisan **isključivo u `~/.git-credentials`**
  (IZVAN projektnog foldera, dozvole 0600) + `credential.helper store` globalno;
  remote URL čist (bez tokena). Provereno pre pusha: **`.env` u git istoriji**
  (bio u Initial commit `dd8b046`, izbačen u `11b00a2`) sadrži **SAMO lokalnu
  putanju** `DATABASE_URL=file:…/db/custom.db` — bez mrežnog kredencijala, bez
  lozinke → bezbedno, bez prepisivanja istorije. Spajanje: `git fetch` →
  `merge origin/main --allow-unrelated-histories` (README commit `4366e1e`; merge
  `6243ecb`, obe istorije sačuvane, README dodata lokalno bez konflikta) →
  **`git push origin main` uspeo: `4366e1e..6243ecb`, fast-forward, BEZ
  force-pusha**. Verifikacija na remote: 57 commitova; `src/` 74 fajla;
  `PROJECT_STATUS.md`, `AGENTS.md`, `db/`, `prisma/`, `README.md` prisutni;
  remote hash == lokalni HEAD. AGENTS.md dopunjen po Nikolinoj naredbi (tačka
  5): posle svakog završenog i testiranog zadatka → commit **+ push origin
  main** (§3.9, §4 GitHub veza, §5 checklist). Kredencijal nikad u repo/istoriju;
  token može regenerisati samo Nikola. Aplikativni kod NIJE diran.
- **2026-11-10 (GitHub push — opcija A, ZIP fallback) — ZAVRŠENO:** Nikola:
  „Sačuvaj trenutnu verziju aplikacije na GitHub takvu kakva jeste; izostavi
  nepotrebne ZIP arhive i tajne, ali sačuvaj kompletan izvorni kod; ako auth
  nije dostupna, napravi ZIP za ručni upload". Ustanovljeno pre odluke: commit
  `6133e1f` („Dashboard verzija") **ne postoji** u repozitorijumu (provereno
  cat-file/reflog/grane/stash — poslednji HEAD je `53af13c`; Dashboard komponenti
  nema ni u radnom stablu) → Nikola izabrao **opciju A**: čuvamo trenutni main.
  Auth ka GitHubu nedostupna (privatan repo: `git ls-remote` → „could not read
  Username"; nema credential helpera, gh CLI ni tokena) → po naredbi **ZIP
  fallback**: `git archive` HEAD → `download/katchamak-source-2026-11-10.zip`
  (sadržaj = baš git tree: kompletan izvorni kod, bez backups/*.zip, bez .env,
  bez node_modules/.next; `unzip -t` čist). **backups/ izbačen iz git praćenja**
  (`git rm -r --cached backups`, 12 zipova ostaje na disku; `.gitignore` +
  `backups/`). **Dopuna istog zadatka:** u prvom ZIP snimku našle su se i 4
  generisane `.zip` arhive iz `download/`, `public/` i `upload/` (16,5 MB,
  uključujući dve identične kopije `kachamak-aplikacija.zip` od 8,1 MB) — sve
  izbačene iz praćenja (`git rm --cached`, lokalno ostaju), `.gitignore` +
  `*.zip`; finalni snimak `katchamak-source-2026-11-10.zip` je bez ijednog
  zipa i bez tajni. Push čeka auth (fine-grained PAT, Contents: Read and write):
  tada `fetch` → `merge origin/main --allow-unrelated-histories` (README,
  obe istorije sačuvane) → `push origin main` → verifikacija na GitHubu;
  bez force-pusha. Aplikativni kod NIJE diran.
- **2026-11-09 (lenjir u svakoj površini + odvojen zoom po površini) — ZAVRŠENO:**
  Nikola ispravio sebe: „sve je dobro ali lenjir mora da ide svaka radna
  površina da ima svoj kako bi svaka radna površina imala odvojen zoom“:
  (1) **LENJIR U SVAKOJ POVRŠINI** — `RulerRow` vraćen iz jednog pune-širine
  reda U svaki panel: `SplitEditors` panel = kontejner (klik-bira, zlatna
  linija, širina iz splitRatio) → zoom omot → `RulerRow` + `EditorPage` (ili
  `EmptyPaneBody` — prazna površina IMA lenjir, „dva identična ekrana“ u svakom
  stanju). Lenjir je i dalje bez pozadine (boja površine) i poravnat sa stubcem
  svoje strane (min(48rem, 100%) u širini PANELA, ne cele radne površine);
  razdelnik sada seče i kroz red lenjira (kao u Scriveneru — svaki editor svoj
  lenjir). (2) **ODVOJENI ZOOM PO POVRŠINI** — novi `paneAZoom`/`paneBZoom` u
  store-u (number|null, persist; `setPanelZoom` proširen sa
  „left|mid|right“ na + „paneA|paneB“); `CtrlZoom` izdvojen u `CtrlZoom.tsx`
  (isti native wheel listener) i kačen na OBA pane kontejnera; kad zoom
  površine još nije podešen (null) čita se midZoom — bez skoka pri prelasku
  iz Write moda, prvi Ctrl+skrol nad površinom je zauvek odvaja;
  `stopPropagation` u wheel handleru da event ne „probije“ do main listenera
  (koji bi menjao midZoom). Zoom omot je unutar panela — širine panela i
  razdelnik ostaju u pravim pikselima (drag računanje jednostavnije).
  **VERIFIKACIJA (uživo):** screenshot — traka 2 TAČNO JEDNOM, dva lenjira
  (svaki sa okom, iznad svoje strane); Ctrl+skrol nad B ×3 → `paneBZoom=1.3`,
  A i midZoom netaknuti; piksel: lenjir B viši (y85–110) od A (y80–103),
  tekst B veći; Ctrl+skrol nad A → `paneAZoom=1.1` uz B ostao 1.3; razdelnik
  0.499→0.604 (A=443px) → vraćeno 0.5; test zoomovi resetovani na null/null;
  Write mod neizmenjen (jedan lenjir, midZoom); Grid/List netaknuti; traka 2
  y=79: **894/894 = 100%** na 1440px; boja iza lenjira = površina
  (13,13,13 = 13,13,13); nema duplirane trake (y=119 prazno); tsc 0 grešaka
  (src/), build čist, konzola bez grešaka.

- **2026-11-09 (ispravka Split-a: formatna traka fiksna, lenjir = traka 3) — ZAVRŠENO:**
  po Nikolinoj ispravci „ne treba da dupliraš formatting bar — on stoji fiksan
  stalno, na njega utiču jedino bočni paneli kad se pomeraju; radna površina
  ispod lenjira se deli; lenjir je ustvari treća traka ali nema pozadinu pa se
  traka ne vidi“: (1) **TRAKA 2 — JEDNA INSTANTA**: formatna traka je izvučena
  IZ `WriteArea` u novi `EditorToolbar` (isti izgled, ista visina h-10 i
  border-b) i renderuje je `NotesSection` JEDNOM, iznad sadržaja — u Write
  modu sa otvorenom notom i u Split modu (uvek, i kad su paneli prazni); u
  Grid/List/Write-bez-selekcije ostaje stari prazan h-10 red koji drži njenu
  donju liniju. Font/veličina/prored su prešli u store (`editorFont`/
  `editorSize`/`editorSpacing` + setteri, persist, `?? default`) — traka je
  sada globalna pa i ta podešavanja važe za stranu u Write i OBA Split panela
  (i više se ne resetuju pri promeni note). (2) **TRAKA 3 — LENJIR IZNAD
  OBA PANELA**: novi `RulerRow` (providan red h-7, bez pozadine/ivica — ista
  boja kao površina, zato se traka ne vidi; unutra `RulerStrip` + oko) stoji
  JEDAN put iznad razdeljenih površina, u `SplitEditors` I u `WriteArea`;
  **deli se samo radna površina ISPOD lenjira**: `SplitEditors` = RulerRow pa
  flex red [pane A | razdelnik | pane B], paneli su čiste strane — novi
  `EditorPage` (naslov + RichEditor, skroler po panelu) umesto punog
  WriteArea, `EmptyPane` bez lažnog h-10 reda (više nije potreban). Zoom
  srednjeg panela (CSS `zoom`) i dalje važi za lenjir + površine, NE i za
  traku 2 (linije ostaju poravnate). **VERIFIKACIJA (uživo):** Split — traka
  2 na ekranu TAČNO JEDNOM (piksel-provera: nema linije na y≈119 u panelima,
  gde bi bila dupla traka); lenjir JEDAN red preko cele širine, boja iza
  njega = radna površina (13,13,13 = 13,13,13) na 1280 i 1440; razdelnik
  počinje TEK ISPOD lenjira (y=104 još površina); klik na desnu površinu pa
  na „Scene 1“ (The Tether) → ušla SAMO u B (ID proveren), A zadržao „The
  third dial waited.“; klik na levu pa na „Scene 1“ (The Cemetery) → SAMO u
  A (ID proveren), B netaknut; drag razdelnika 624→560 → ratio 0.5→0.413,
  širine A/B = 303/430, vraćeno na 0.5; oko sakriva/prikazuje lenjir; Write
  mod ista arhitektura (traka + lenjir + strana), Grid/List neizmenjeni;
  traka 2 y=79: **894/894 = 100%** na 1440px; tsc 0 grešaka (src/), build
  čist, konzola bez grešaka.

- **2026-11-09 (Split — dva nezavisna editora kao u Scriveneru) — ZAVRŠENO:**
  po Nikolinoj naredbi „pritiskom na Split, radna površina se podeli na dva
  identična ekrana koja mogu da se šire i skupljaju kao u Scriveneru; kada
  klikneš na površinu koju izabereš i onda klikneš na neki note ona se menja,
  a druga ne — i naravno to važi i za drugu“ (uz uputu: ne brinuti o sadržaju
  projekta dok aplikacija ne radi kako treba):
  (1) **STORE** — novi `paneAId`/`paneBId` (nota u levom/desnom editoru),
  `activePane` („a“|„b“), `splitRatio` (0.2–0.8) + `setActivePane`/
  `setSplitRatio` — sve persist, čita se sa `?? default` (stari store-ovi OK).
  `select()` otvara notu u FOKUSIRANOM editoru (drugi zadržava svoju);
  `setActivePane` postavlja i `selectedNodeId` — inspector, brojač na dnu i
  highlight u stablu prate fokusiranu površinu; `setView("split")` pri prvom
  ulasku klonira otvorenu notu u OBA editora, `SplitEditors` isto pri mount-u
  posle reload-a kad su paneli prazni; `addNode` novu notu otvara u aktivnoj;
  `deleteNode` čisti panele koji su pokazivali na obrisano (bez duhova);
  openNovel/closeNovel/createNovel/importNovel resetuju panele pri promeni
  romana. (2) **NOVA KOMPONENTA `SplitEditors.tsx`** — dva identična WriteArea
  (svaki sa svojim toolbarom, linealom i okom) + `SplitResizer` (vuče se
  levo/desno, isti pattern kao resizer panela; try/catch oko
  setPointerCapture) + `EmptyPane` (prazna površina sa h-10 redom da linija
  trake 2 ostane neprekinuta). Fokusirana površina ima tanku zlatnu liniju na
  vrhu (2px overlay — ne pomera layout ni linije). U `NotesSection`: view
  „split“ renderuje SplitEditors; centralni prazan h-10 red se u split-u
  preskače (paneli ga sami drže). Write/Grid/List neizmenjeni.
  **VERIFIKACIJA (uživo):** split 50/50 — oba editora kloniraju notu; klik na
  desnu površinu pa na „Scene 1“ u stablu → desna se menja, LEVA OSTAJE; klik
  na levu pa na „The Query“ → samo leva (brojač 40 words = reči te note);
  drag razdelnika 160px → ratio 0.5→0.678, širine 606/287; posle reload-a sve
  ostaje (note, aktivna površina, širine); nova nota ide u aktivnu; brisanje
  otvorene note prazni panel bez duhova; promena romana resetuje panele;
  traka 2 y=79: 1440/1440 = 100%; pozadina iza OBA lineala = boja površine
  (13,13,13); oko lineala radi (preferenca zajednička, kao i do sad); tsc 0,
  build čist, konzola čista. Test note u CASHABLANCA obrisane, Trash
  ispražnjen (roman 0/0 kao pre testa). Nikolaovo stanje vraćeno: split 50/50,
  „The third dial waited.“ u oba panela.

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
