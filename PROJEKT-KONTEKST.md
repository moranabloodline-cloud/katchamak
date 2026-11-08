# PROJEKT-KONTEKST — Kachamak (pročitaj ovo prvo!)

> **Ovaj fajl je uputstvo za novu sesiju.** Ako je korisnik (Nikola) poslao ovde,
> znači da nastavlja rad na projektu iz prethodnih sesija. Sve što treba da
> znaš je u ovom fajlu + u `KACHAMAK-ARHITEKTURA.md` (u korenu projekta).
> Ne menjaj ništa bez da pitaš. Radi tačno ono što Nikola kaže, redom.

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
- **Top bar**: tabovi Binder/Codex/Planning/Research/Templates/Prompts/Trash
  (zlatna aktivna: `border-[#ad7e2e]/80 bg-[#3a2c18] text-[#fbe4a6]`); desno
  **Tree Scope dropdown** (All/Folders only/Top level only), Save (toast
  „Saved locally · vreme"), Account avatar (inijali → `AccountDialog`), Settings
  (→ `SettingsDialog`).
- **Levi panel**: header sa tab imenom, +(add), •••, Expand/Collapse all; stablo
  sa strelicom+ikonom+naslovom+tri-dot; **levo-donja traka**: ⓘ dugme
  (Popover: Save/Recovery/Copy feedback) + **Split | Write | Grid | List**
  dugmad uz desnu ivicu levog panela — fiksno, ne skroluje sa stablom.
- **Desni panel**: Label + Status + boja u istom redu (`RightPanel.tsx`),
  Synopsis/Notes, hide dugme; `NoteMetaBar` dole.
- **GridView / ListView / WriteArea** (rich editor), `NoteMetaBar`, resizer-i
  za oba panela (levi 240–560px, desni 190–680px, persistovano).
- Fix od ranije: `sr-only` span leak (svugde `relative` roditelji) +
  `html,body{overflow:hidden}` u `globals.css` — stranica se više ne pomera.

## 4. Šta je SLEDEĆE (po redu — iz arhitektura dokumenta, §5 i dalje)

**Nije započeto nijedno.** Nikola je rekao „ajmo redom" — prvo pitanje novoj
sesiji: nastaviti sa tačkom 6.

6. **Corkboard umesto Grid** — klasične Scrivener index kartice: ikona+naslov+
   **Synopsis** na kartici; prikazuje **samo jedan nivo hijerarhije** odjednom;
   **dupli klik** otvara note; **drag** za premeštanje/redosled. NEMA: infinite
   canvas, nested frames, auto-proširivanje parent okvira, podesive veličine
   kartica. (Dugme „Grid" u levom panelu postaje „Corkboard"; ViewMode `grid`→
   preimenovati/prepakovati, GridView.tsx → Corkboard.)
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
node_modules/.next). Za novi backup: zip bez tih foldera, u `download/`.

## 10. Reference

- **`KACHAMAK-ARHITEKTURA.md`** (koren projekta) — snimak Nikolaovog
  arhitektura dokumenta (23 poglavlja) = **autoritativna specifikacija**.
  Kada ovaj kontekst-fajl i dokument kažu različito, **dokument pobeđuje**,
  a Nikolaova trenutna reč pobeđuje sve.
