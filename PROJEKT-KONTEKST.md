> **Važeća odluka 13.11.2026:** razvojna aplikacija koristi isključivo Sites cloud storage po ChatGPT nalogu. Preview i browser dele biblioteku. Ne vraćati root pickere, lokalni Save ili installer dok korisnik ponovo ne zatraži lokalnu fazu. D1 indeks + R2 privatni sadržaj, optimistička revizija za zaštitu od konflikata. Postojeći lokalni fajlovi ostaju netaknuti. Istorijske lokalne upute ispod nisu trenutni zahtev.

# PROJEKT-KONTEKST — Kachamak (pročitaj ovo prvo!)

> **Aktuelni razvoj: Windows desktop, `C:\Katchamak`.** Koristiti postojeći GitHub main i [DESKTOP.md](DESKTOP.md). Korisnik je 11.11.2026. odobrio lokalni razvoj, Tauri, offline rad i automatski commit/push tek posle provera. Istorijske Sites/GLM instrukcije ispod ne određuju novi razvojni tok. Rukopisi ostaju u odvojenom lokalnom profilu, izvan Git backupa.

> **Ovaj fajl je uputstvo za novu sesiju.** Ako je korisnik (Nikola) poslao ovde,
> znači da nastavlja rad na projektu iz prethodnih sesija. Sve što treba da
> znaš je u ovom fajlu + u `KACHAMAK-ARHITEKTURA.md` (u korenu projekta).
> **Obavezan redosled čitanja:** `AGENTS.md` (pravila) → ovaj fajl →
> `PROJECT_STATUS.md` (aktuelni status) → `KACHAMAK-ARHITEKTURA.md` (spec).
> Ne menjaj ništa bez da pitaš. Radi tačno ono što Nikola kaže, redom.

---

## 0. RESTORE U NOVOJ SESIJI — uradi ovo prvo ako ti projekat fascikla ne sadrži kod

Svaka sesija ima svoju kopiju okruženja — kod NE dolazi automatski. Backup
uvek postoji na dva mesta:

1. **Cloud link (probaj prvo)** — aplikacija je javno dostupna i backup je
   njen statički fajl:
   ```
   https://preview-dev-4f587c10a7748191b994b7e55b02828c.space-z.ai/kachamak-aplikacija.zip
   ```
   ```bash
   cd /home/z/my-project
   curl -o backup.zip "https://preview-dev-4f587c10a7748191b994b7e55b02828c.space-z.ai/kachamak-aplikacija.zip"
   unzip -o backup.zip -d .        # kod + oba dokumenta (PROJEKT-KONTEKST.md, KACHAMAK-ARHITEKTURA.md)
   bun install && bun run build    # node_modules/.next nisu u zipu
   ```
   Dokumenti direktno: `.../PROJEKT-KONTEKST.md` i `.../KACHAMAK-ARHITEKTURA.md`
   (isti prefiks URL-a). Ako curl radi — nastavi iz tačke 3 dole.
   Napomena: ovaj URL je zabeležen iz konfiguracije; ako ne radi, otvori
   **preview link aplikacije koji platforma prikazuje Nikoli** (njegov UI zna
   tačan URL) i dodaj `/kachamak-aplikacija.zip` — fajlovi su verifikovano
   servisirani od strane aplikacije (localhost 200 proveren).
2. **Nikola otpremi zip** (ako link ne radi): `download/kachamak-aplikacija.zip`
   je uvek najnoviji; Nikola ga skine iz prethodne sesije i otpremi ovde;
   `unzip -o` u koren projekta.

Posle restora: pročitaj ostatak ovog fajla (§3 status, §4 šta je sledeće,
§5 otvorena pitanja) i **nastavi od tačke koja je prva nerealizovana**.

---

## 1. Šta je ovo projekat

**Kachamak** — privatna pisalačka radionica u Next.js-u za roman
**„Morana: Bloodline"**. Nikola ga originalno pravi na ChatGPT Sites, a ovde
ga replikiramo piksel-po-piksel po njegovim screenshotovima i arhitekturi.

- Next.js 16 (App Router) + React + TypeScript + Tailwind + shadcn/ui + Zustand
- Podaci se čuvaju u **localStorage** (persist + migrate, store verzija **4**)
- Aplikacija je **app-shell**: `html,body{height:100%;overflow:hidden}` —
  stranica nikad ne skroluje, skroluju samo unutrašnji kontejneri

## 2. Kako Nikola radi — VRLO VAŽNO

- **„Ajmo redom"** — tačka po tačka, strogo po redu, bez preskakanja.
- **ZABRANJENE su neistražene izmene.** Ništa „usput", ništa „pošto već tu sam".
- Sve po njegovim rečima i screenshotovima **doslovno**. Njegova izjava:
  > „Ako ti ja budem davao slike i precizne instrukcije a ti budeš pravio ono
  > što ti želiš onda ova saradnja nema smisla... mislim da sam kristalno jasan"
- Posle svake tačke: build + screenshot provera + **prijava na srpskom** + čekaj potvrdu.
- Komunikacija **isključivo na srpskom**.

## 3. STATUS — šta je ZAVRŠENO (provereno u kodu, store v4, build 08.11. 23:41)

Svih **5 zahteva** iz prethodne sesije je implementirano:

1. ✅ **Donja traka radne površine** (`NotesSection.tsx` red 379–385):
   full-width traka ispod centralnog dela — **Target ikonica skroz levo**,
   **word count u sredini** (`novelWords(novel)` format „71,257 words").
2. ✅ **Everything is a Note** — svaki tab je isti note sistem, Codex uključen
   (store migrate v3→v4: stari Codex categories/entries → obične notes;
   `types.ts`: „every tab is the same note system").
3. ✅ **Slobodna hijerarhija** — novi notes su uvek `kind:"doc"`, korisnik sam
   bira ime/ikonu/boju (stari act/chapter/scene/folder su samo za legacy podatke).
4. ✅ **Klik na ikonu nota → icon picker popup** (`NoteTree.tsx`: Popover na
   ikonu, `pickerOpen`; radi i preko menija „Change icon" sa 100ms delay-em
   da se ne bi zatvorio uz dropdown cleanup).
5. ✅ **Tri-dot meni** na kraju reda (vidljiv na hover / dok je meni otvoren),
   tačna struktura iz dokumenta: `Create note` | Rename, Duplicate, Export,
   Move, Delete (crveno) | Sort sub-pages | Hide/Show | Collapse, Expand |
   Change icon + **Move dijalog** (izbor bilo kog section root-a ili note-a kao
   novi parent; selekcija pušta toast „Moved … to …").

Dodatno već postoje:

- **Trash tab** sa restore-om (`TrashView.tsx`, `TrashItem` sa parentId/section,
  `deleteNode` → Trash, restore vraća na mesto; Delete taster na tastaturi radi).
- **Top bar (jedna traka, h-10)**: Home+Search levo (zona levog panela), tabovi
  Binder/Codex/Planning/Research/Templates/Prompts/Trash u sredini, svi u
  jednom redu (zlatna aktivna: `border-[#ad7e2e]/80 bg-[#3a2c18]
  text-[#fbe4a6]`), Tree Scope dropdown (All/Folders only/Top level only) +
  Save (toast „Saved locally · vreme") + Account avatar (inijali →
  `AccountDialog`) + Settings (→ `SettingsDialog`) desno (zona desnog
  panela). **Druga traka (h-10, poravnata)** ispod: header levog panela |
  editor toolbar (jedan red, px-4) | Info/Details/Mentions tabovi desno —
  bez ikonica i bez okvira, svetli samo selektovani zlatnom pilulom; ukupno
  dve trake od vrha.
- **Levi panel**: header sa tab imenom, +(add), •••, Expand/Collapse all; stablo
  sa strelicom+ikonom+naslovom+tri-dot; **levo-donja traka**: ⓘ dugme
  (Popover: Save/Recovery/Copy feedback) — fiksno, ne skroluje sa stablom.
- **Donja traka radne površine**: Target ikonica skroz levo, word count u
  sredini, **Split | Write | Grid | List uz desnu ivicu srednjeg panela**
  (09.11. premešteno iz levog panela po Nikoli).
- **Desni panel**: Label + Status + boja u istom redu (`RightPanel.tsx`),
  Synopsis/Notes, hide dugme; `NoteMetaBar` dole — Label i Status „wrap“ oko
  svog teksta, uz levu ivicu panela (na uzom panelu se skupljaju/seku,
  `overflow-hidden`).
- **Corkboard / ListView / WriteArea** (rich editor), `NoteMetaBar`, resizer-i
  za oba panela (levi 240–560px, desni 190–680px, persistovano).
- Fix od ranije: `sr-only` span leak (svugde `relative` roditelji) +
  `html,body{overflow:hidden}` u `globals.css` — stranica se više ne pomera.
- **✅ Tačka 6 — GRID (uradjeno 09.11., ime ispravljeno po Nikoli):**
  `Corkboard.tsx` zamenio GridView (obrisan) — ali **naziv moda je „Grid"**,
  po Nikolaovoj ispravci („NISAM TI DOZVOLIO DA PROMENIŠ Grid u Corkboard —
  taj naziv Grid je ispravan"). Klasične Scrivener index kartice: **ikona +
  naslov + Synopsis**, papir boje `#efe6cf` na tamnoj pluti `#241c12`, caption
  „GRID · <nivo>" zlatno. **Jedan nivo hijerarhije**: deca selektovanog
  kontejnera / sama leaf nota / top nivo sekcije kad ništa nije selektovano.
  **Dupli klik** otvara notu u Write modu. **Drag & drop reorder** (HTML5 DnD,
  zlatna ivica-ubacivač pre/posle, drop na plutu = na kraj) preko novog
  opcionog `destIndex` parametra u `moveNodeTo`. Store **v5** (migracija:
  sačuvani `view:"grid"` → `"corkboard"` interno). „+ New note" dodaje u
  otvoreni nivo. Testirano: render, nivoi, dupli klik, drag reorder +
  persistencija posle reload-a, build + tsc čisti.
- **✅ Ispravke po Nikolinoj prijavi (09.11.):**
  1. **Header linije poravnate** — vertikalne linije topbara bile su 1px
     ukrivo u odnosu na linije panela (levo header 255 vs body 256; desno
     header 1152 vs body 1151). Fix: header zone width = panelWidth + 1
     (pokriva 1px resizer kolonu). Mereno pikselima: 256=256, 1151=1151.
  2. **Mod prikaza (Split/Write/Grid/List) se VIŠE NE RESETUJE** —
     openNovel/createNovel/importNovel više ne postavljaju view; ostaje
     uvek na poslednjem aktivnom modu (kroz tabove, izbor fajla, izlaz na
     dashboard i ponovno otvaranje — testirano).

## 4. Šta je SLEDEĆE (po redu — iz arhitektura dokumenta)

**Tačke 1–6 završene.** Sledeća je tačka 7.

7. **Inspector reorg** — desni panel u 3 taba: **Info** (Synopsis + Notes
   vertikalno, **draggable razdelnik** između njih), **Details** (povezivanje
   sa Codex notama, pretraživo), **Mentions** (ko pominje ovu notu); panel ostaje
   collapsible.
8. **Toolbar dopune** — postojeći dizajn ostaje (Segoe UI 16px, 1.5 line-height,
   B I U S, liste, citat, poravnanje, palette, highlight, Tx); dodati: **Text
   Style dropdown (podrazumevano „Normal")** + dugmad **Copy, Delete, Link**.
9. **Tabovi — pravila**: obavezni (ne mogu se brisati/preimenovati):
   **Binder, Codex, Trash**; brisljivi: Planning, Research, Templates, Prompts;
   podrška za **korisničke (custom) tabove**.
10. **Top bar — „Current Note" dropdown** umesto/dopuna Tree Scope (po
    dokumentu: ime aktivne note u topbaru, desno).
11. **Storage/eksport** — Vault (Markdown fajlovi) + **Master Backup_&lt;Project&gt;.json**;
    eksport: Importable Master, HTML, Markdown, JSON. (Note-level JSON eksport
    već postoji — `exportNoteJson`.)
12. **Dashboard** (po dokumentu, početni ekran projekta).

## 5. Otvorena pitanja (pitati Nikolu kada dođe na red)

- Meni u kodu piše **„Create note"**, a na njegovom screenshotu menija piše
  **„Create sub-page"** — pitati koje ime želi.
- Screenshot menija sadrži i stavku **„Edit permissions"** (između Sort
  sub-pages i Hide) koju arhitektura dokument NE pominje — pitati da li je treba.

## 6. Mapa ključnih fajlova

```
src/lib/kachamak/
  types.ts      NoteNode, SectionKey, TABS, TreeScope, ViewMode
  store.ts      Zustand + localStorage persist, version:4 + migrate (v0→v4)
  seed.ts       inicijalni podaci (Morana: Bloodline), DEFAULT_STATUSES
  icons.tsx     NOTE_ICONS + rowIcon pomoćnik
  utils.ts      novelWords, nodeWords, id, itd.
src/components/kachamak/
  Workspace.tsx   top bar (tabovi, TreeScope, Save, Account, Settings) + telo
  NotesSection.tsx levi panel + stablo + resizer + centralni deo + DONJA TRAKA
  NoteTree.tsx    stablo: redovi, rename, tri-dot meni, icon picker, Move dialog
  GridView.tsx / ListView.tsx / WriteArea.tsx  prikazi centralnog dela
  RightPanel.tsx  desni panel (Label/Status/boja, Synopsis, Notes)
  TrashView.tsx   Trash tab (restore)
  Home.tsx        početna (novel cover, dugmad)
  AccountDialog.tsx, RichEditor.tsx
src/app/page.tsx + layout.tsx + globals.css   app-shell, kachamak-scroll
```

## 7. Tehnički workflow (kako se radi i proverava)

```bash
cd /home/z/my-project
bun run build          # produkcijski build (mora proći pre svake prijave)
bunx tsc --noEmit      # tipovi (greške su OK samo u examples/ i skills/)
bun run start          # server na localhost:3000 (pre toga: pkill -f "next start")
```

- Testiranje UI: **agent-browser** skill (open, find role/text, eval, screenshot).
- Provera scrollbar/fiksiranost: `eval` sa `scrollTop` / `scrollHeight`.
- crop skripte: `scripts/crop_bottom.py`, izlazi u `scripts/crops/` (PIL, 3x zoom).
- Reference screenshotovi (original aplikacija): `upload/pasted_image_*.png` —
  `…2830380.png` i `…3055590.png` = donja traka originala; `…6486876.png` =
  **tri-dot meni originala** (Create sub-page / Rename / Duplicate / Export /
  Move / Delete / Sort sub-pages / Edit permissions / Hide / Collapse all /
  Expand all / Change icon).
- **Nikad ne menjati fajlove u `upload/`** — to su Nikolaovi ulazni materijali.
- Store migracije: svaka promena šeme podataka = **novi `version`** + migrate
  grana (trenutno v4). Ne dirati postojeće migracione grane.

## 8. Dizajn sistem (zabeleženo sa screenshotova)

- Pozadina `#0d0d0d`; paneli `#1b1b1b` / `black/20`; skoro crno, tanke
  svetlosive linije (`border-white/10`), donje trake `border-amber-500/25`.
- Zlatni akcenti: aktivni tab `#ad7e2e/#3a2c18/#fbe4a6`; ⓘ i Target
  `text-amber-400/90`; list dugmad aktivna `border-amber-400/70
  bg-amber-400/15 text-amber-300`; ranije i orange akcenti (`orange-500/40`).
- Meniji/dijalozi: tamna pozadina, `font-serif` u dropdown meniju (po originalu).
- Statusi (DEFAULT_STATUSES): N/A, To Do, First Draft, Revised Draft, Final
  Draft, Done. Labeli = slobodan tekst sa bojom.
- Editor spec iz dokumenta: **Segoe UI, 16px, line-height 1.5**.

## 9. Backup

`download/kachamak-aplikacija.zip` — kod trenutka 08.11.2026. (bez
node_modules/.next). **Za novi backup: `bash scripts/backup.sh`** — snapshot u
`backups/` (čuva se 12), osvežava download i public kopije, secrets-guard
(bez `.env`/ključeva), git commit; dnevno se sam pokreće cron-om u 03:00.
Detalji: `PROJECT_STATUS.md` §6.

## 10. Reference

- **`KACHAMAK-ARHITEKTURA.md`** (koren projekta) — snimak Nikolaovog
  arhitektura dokumenta (23 poglavlja) = **autoritativna specifikacija**.
  Kada ovaj kontekst-fajl i dokument kažu različito, **dokument pobeđuje**,
  a Nikolaova trenutna reč pobeđuje sve.
