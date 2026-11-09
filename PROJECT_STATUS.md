# PROJECT_STATUS — Kachamak

> **Ažurira se posle SVAKOG završenog zadatka** (pravilo `AGENTS.md` §3.9).
> Čita se na početku sesije, posle `AGENTS.md`, pre bilo kakve izmene.
> **Zadnja izmena:** 2026-11-09 (sesija: kontinuitet i backup).

---

## 1. Šta je ZAVRŠENO (verifikovano u kodu)

Store **v5** · zadnji poznati build: **čist** (09.11.2026, uz Grid zadatak).

| # | Stavka | Gde u kodu |
|---|--------|------------|
| 1 | Donja traka radne površine: Target ikonica skroz levo, word count u sredini (`novelWords`, format „71,257 words") | `NotesSection.tsx` |
| 2 | Everything is a Note — svi tabovi isti note sistem (Codex uključen; migrate v3→v4) | `types.ts`, `store.ts` |
| 3 | Slobodna hijerarhija — novi notes uvek `kind:"doc"`, ime/ikona/boja po korisniku | `types.ts` |
| 4 | Klik na ikonu note → icon picker popup (i preko menija „Change icon") | `NoteTree.tsx` |
| 5 | Tri-dot meni (tačna struktura iz dokumenta) + Move dijalog (izbor bilo kog root-a/note-a za parenta) | `NoteTree.tsx` |
| 6 | **Grid** (zadata 09.11.): Scrivener index kartice (ikona + naslov + Synopsis), papir `#efe6cf` na pluti `#241c12`, caption „GRID · <nivo>", jedan nivo hijerarhije, dupli klik → Write, drag & drop reorder (`destIndex` u `moveNodeTo`), „+ New note" u otvoreni nivo; **store v5** (migracija `view:"grid"`→interno `"corkboard"`) | `Corkboard.tsx` |
| 7 | Ispravke 09.11.: header linije piksel-poravnate (header = panelWidth+1); **mod prikaza se više ne resetuje** (ostaje poslednji aktivan kroz tabove/otvaranje/izlaz) | `NotesSection.tsx`, `store.ts` |
| + | Već postoje: Trash sa restore-om, top bar (Binder/Codex/Planning/Research/Templates/Prompts/Trash + Tree Scope + Save + Account + Settings), levi panel (stablo, ⓘ popover, Split/Write/Grid/List fiksirani), desni panel (Label+Status+boja, Synopsis/Notes, NoteMetaBar), resizer-i, app-shell bez skrola stranice (`globals.css`) | v. `PROJEKT-KONTEKST.md` §3 |

## 2. Šta je U TOKU

- **Ništa u aplikativnom kodu** — kod je u potvrđenom stanju (Grid završen i prijavljen).
- *(ova stavka se briše/ispunjava posle svakog zadatka)* Kontinuitet i backup
  infrastruktura (AGENTS.md, PROJECT_STATUS.md, backup skript, dnevni cron,
  sigurnosni fix `.env`) — **u završnoj fazi, vidi Dnevnik**.

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
| 5 | `public/kachamak-aplikacija.zip` — cloud kopija na preview deploymentu | gubitak celog workspace-a | osvežava skript |
| 4b | `download/kachamak-backup-<datum>.zip` — datumovane kopije | istorija za Nikolu | ručno |
| 6 | **Cron „Kachamak — dnevni backup", 03:00 (Europe/Belgrade)** | zaboravljena ručna kopija | konfigurisan |

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

- **2026-11-09 (kontinuitet/backup sesija):** Kreirani `AGENTS.md` (stalna
  pravila + obavezan redosled čitanja) i `PROJECT_STATUS.md` (ovaj fajl);
  napisan `scripts/backup.sh` (snapshot + secrets-guard + download/public
  kopije + rotacija 12 + git commit); konfigurisan dnevni cron 03:00;
  **sigurnosni fix:** `.env` izbačen iz git indeksa i iz oba zipa; snapshot,
  restore-drill i test „nove sesije" verifikovani. Aplikativni kod NIJE diran.
- **2026-11-09 ~08:02 (prethodni deo sesije, commit `9457ee5`):** Ispravka po
  Nikolinoj prijavi — naziv mode-a vraćen na **„Grid"** (zabrana preimenovanja
  u „Corkboard"); checkpoint commit platforme.
