> **2026-11-15 — Prikazi kao prekidači:** prvi klik na Split/Grid/List otvara prikaz, ponovni klik na aktivni prikaz vraća Write. Timeline u gornjoj traci koristi isto pravilo; Write ostaje Write. Izbor note i Split pane identiteti se ne menjaju. Provere: TypeScript, produkcijski build i browser QA za sva četiri prelaza i povratka.

> **2026-11-15 — Timeline u gornjoj traci:** Timeline je samostalna gornja navigaciona kartica pre +, uz postojeće sekcije; označava se kao aktivna umesto sekcije iz koje je otvorena. Zadržava postojeći kontekst sekcije/foldera i sve datume, kalendare i opcije. Klik na sekciju vraća prethodni note prikaz tokom sesije. Donji redosled je Write / Grid / List / Split, bez Timeline dugmeta. URL/cloud kompatibilnost ostaje preko postojećeg timeline view ključa, bez promene šeme. Provere: TypeScript, story-calendar, note-workflow, produkcijski build i browser QA Timeline/povratak/List/Split/reload.

> **2026-11-15 — Ikonice u List prikazu:** svaki red koristi sačuvanu ikonu i boju note, istim iconByName resolverom kao ostali prikazi; bez izabrane ikone koristi Note, bez boje muted temu. Podnote više ne menjaju izabranu ikonu u generički folder. Provere: TypeScript, produkcijski build i vizuelni browser QA sa tirkiznom lokacijom i ljubičastim likom.

> **2026-11-15 — Širine List kolona:** tabela i kolone automatski prate najduži tekst u svakoj koloni, bez razvlačenja preko panela i prelamanja naziva/labela/statusa. Kada tabela premaši panel, dostupan je horizontalni skrol. Provere: TypeScript, produkcijski build i vizuelna browser provera.

> **2026-11-15 — List prati izbor:** List prikazuje samo označenu notu i sve njene podnote, unutar aktivne sekcije/taba foldera; bez izbora prikazuje postojeći scope. Kolona Synopsis zamenjena je kolonom Label koja čita stvarnu labelu note (ili —), dok sinopsis ostaje u Info panelu. Provere: TypeScript, produkcijski build i browser QA na sintetičkom stablu sa drugim aktom, ugnježđenom notom i pojedinačnom notom; labele Revision/Final i odsustvo drugih aktova potvrđeni.

> **2026-11-15 — Grid boje i suvišan naslov:** uklonjen Grid · naziv izabrane note iznad kartica. Grid sada koristi boje background/card/foreground/muted/border aktivne teme umesto braon pozadine i krem kartica; boja note je vidljiva na ikoni i gornjoj ivici kartice, uključujući podrazumevanu ikonu. Selekcija, veličine, sinopsisi i drag/drop nisu menjani. Provere: TypeScript, produkcijski build i browser prikaz na sintetičkom projektu.

> **2026-11-15 — Zaštita tabova:** X dugmad su uklonjena iz gornje trake. Desni klik na dodatni tab nudi Delete i obaveznu potvrdu sa Cancel/Delete. Potvrda izričito kaže da se uklanja samo kartica, dok sve note i folderi ostaju u projektu; postojeće sekcije se vraćaju preko +/Show, a tabovi nota kroz Open as tab. Binder, Codex i Trash ostaju stalni. Potvrda je vezana za projekat da ne zatvori tab posle promene projekta. Provere: TypeScript, postojeći testovi očuvanja sadržaja tabova, produkcijski build i browser QA potvrde/otkazivanja/vraćanja.

> **2026-11-15 — 0.3.4, podešavanja romana prema referenci:** zupčanik u Workspace-u otvara široki dvokolonski Settings: Metadata (naslov, autor/pseudonim, postojeća/nova serija i indeks), Cover (JPG/PNG/WebP upload ili drag/drop, pregled i uklanjanje) i Danger Zone (Archive/Unarchive, Delete sa unosom tačnog naslova i backup opcijom). Save changes čuva naslov/autor/seriju i optimizovanu raster-koricu u privatnom cloud snimku; korica je ograničena na 700k znakova, bez udaljenih URL-ova i uključena u JSON backup. Postojeći bg/icon omoti ostaju ako nema slike. Dashboard prikazuje sliku i seriju i nudi Archived pregled sa vraćanjem. Arhiva ne menja note ni članstvo u kolekcijama. Brisanje čuva pre mutacije, uklanja članstva i vraća projekat/članstva pri neuspešnom cloud upisu. Stari import/export i manuscript compile ostaju u Backups & Export. Store v10 dodaje opcione metapodatke, bez prepisivanja starih projekata; cloud validator proverava nove vrednosti. Provere: project-settings, cloud roundtrip/izolacija/otkazivanje brisanja, migracije i regresije; browser QA na sintetičkom projektu: Save/reload, serija, upload korice, Dashboard prikaz, arhiva/restore, blokada Delete i postojeći izvoz.

> **2026-11-15 — Kraći natpisi:** dugmad na dnu levog panela sada glase Expand i Collapse. Akcije i ostali meniji ostaju isti.

> **Undo/Redo i automatska linija — aktuelno:** Undo/Redo dugmad u traci, Ctrl+Z, Ctrl+Y i Ctrl+Shift+Z rade nad aktivnim editorom. Istorija je odvojena po otvorenom editoru, u memoriji, do 100 snimaka; grupiše uzastopno kucanje i čuva HTML/poziciju selekcije. Reload, zatvaranje editora ili spoljna zamena teksta počinju novu istoriju, bez vraćanja zastarelih cloud snimaka. Browserov globalni Undo nije korišćen jer je QA pokazao da može menjati drugi Split panel. Samostalni red --- pretvara se u hr odmah pri trećoj otkucanoj crtici, bez Entera/razmaka; dodaje prazan pasus za nastavak. Paste, Undo/Redo, proza, code/pre, naslovi i liste ne pokreću automatsku konverziju. Undo vraća crtice bez ponovne konverzije. Nema nove šeme ni browser skladišta. Provere: editor-history, editor-divider, editor-headings, postojeći editor/paste/link testovi, TypeScript i produkcijski build; browser QA dva Split panela, prečica/dugmadi, trenutno nastajanje linije i Save/reload na sintetičkoj biblioteci.

> **2026-11-15 — H1–H6:** definisana semantička vizuelna hijerarhija u zajedničkom editoru (2 / 1.6 / 1.35 / 1.2 / 1.1 / 1 em), težina, prored i razmaci; prvi naslov nema dodatni gornji razmak. Padajući meni čuva selekciju dok toolbar dobije fokus, pouzdano primenjuje h1–h6/p na odgovarajući editor i odmah pokreće postojeći Save tok. Nivo se čita iz DOM položaja kursora, bez queryCommandValue zavisnosti. Ctrl+Alt+1–6 postavlja nivo, Ctrl+Alt+0 običan pasus. Nema prepisivanja rukopisa ili izmene šeme. Provere: editor-headings, rich-editor, TypeScript, produkcijski build; browser QA svih šest nivoa, veličina, Enter u običan pasus i Save/reload na sintetičkoj noti. Referenca za semantiku: https://obsidian.md/help/syntax (veličine su Katchamak skala, ne tvrdnja o identičnoj Obsidian temi).

> **2026-11-14 — Desni klik u praznom prostoru stabla:** kontekstni meni na praznom delu levog panela nudi Create top-level note, Expand all i Collapse all. Kreiranje ignoriše prethodno izabranu podnotu i dodaje na osnovni nivo aktivne sekcije; u tabu foldera kreira unutar tog foldera. Na samoj noti ostaje njen postojeći meni, a tekstualno preimenovanje zadržava browser meni. Otvaranje menija ne menja sadržaj niti briše izbor. Provere: TypeScript, regresija stabla, produkcijski build i browser QA na sintetičkim podacima.

> **2026-11-14 — Move to top level:** direktna opcija u zajedničkom meniju note (tri tačkice i desni klik) premešta notu sa celim podstablom na osnovni nivo iste sekcije. Na već osnovnom nivou je onemogućena. Identitet, tekst, metapodaci i veze ostaju isti; premestena nota ostaje selektovana. Iz folder taba prelazi na sekciju da se nova lokacija vidi. Provere: TypeScript, postojeća tree regresija, produkcijski build i browser QA sa Locations unutar Codex note.

> **2026-11-14 — Desni klik na notu:** otvara potpuno isti postojeći meni kao tri tačkice, bez dupliranja opcija ili akcija. Kliknuta nota se označava; Shift+F10/Context Menu taster otvaraju isti meni iz fokusiranog reda. Preimenovanje zadržava standardni tekstualni kontekstni meni. Provere: TypeScript, tastaturna regresija, produkcijski build i browser provera identičnih opcija/akcije Rename na sintetičkom projektu.

> **2026-11-14 — Navigacija stabla tastaturom:** klik na notu zadržava fokus na njenom redu. Gore/dole biraju prethodnu/sledeću vidljivu notu, prate otvorena podstabla i scope; skrivene i zatvorene podnote se preskaču. Levo/desno zatvara/otvara podnote i prelazi na roditelja/prvo dete; Home/End bira početak/kraj. Izbor se skroluje u vidljivo polje i koristi postojeći select (drugi Split panel ostaje isti). Inputi, meniji i modifikovane strelice ostaju neizmenjeni. Regresioni DOM test pokriva Chapter 10, fokus, granice, skriveno/zatvoreno, preimenovanje, scope, tab foldera i Split. Postojeći test redosleda usklađen je sa preimenovanjem starog Timeline prikaza u Outline iz prethodnog upstream commita.

> **2026-11-14 — Raspored radnih tabova:** Trash je izdvojen uz desnu ivicu srednjeg dela gornje trake i ostaje vidljiv nezavisno od horizontalnog skrolovanja. Binder/Codex i dodatne kartice sa dugmetom plus nalaze se levo od njega. Sačuvan je paralelni rad na kalendarima i Timeline-u sa GitHub main.

> **2026-11-14 — 0.3.2, Timeline i kalendar:** vremenska osa sa trajanjem/preklapanjem, mesečni Calendar i Chronicle prikazuju iste datirane note jedne knjige. Dosadašnji redosled kartica sačuvan kao Outline. Calendar settings uređuje mesece, nedelju, sate/minute, nazive era i prestupne cikluse; promena kalendara čuva apsolutnu poziciju događaja. Grupe sa bojama/filterima, zum, Go to date, Fit events, pomeranje događaja i kraja prevlačenjem. Događaj može da koristi postojeću notu i otvara njen tekst; uklanjanje datuma ili grupe ne briše sadržaj. Store v9 čuva staru strukturu bez izmišljanja datuma. Provere: story-calendar, cloud roundtrip, migracija/Trash, postojeće note/link regresije, TypeScript i browser QA sa sintetičkim podacima.

> **2026-11-14 — 0.3.1, Codex uz rukopis:** Link/Ctrl+K preuzima označeno ime, nudi postojeće note i Create and link za novu praznu običnu Codex notu, na osnovnom nivou ili unutar izabrane Codex note. Kreiranje ne napušta rukopis i čuva eksplicitnu vezu u Details. Umetanje linka čuva postojeće formatiranje, prazne pasuse i označene završne razmake (Chromium insertHTML regresija). Klik na internu vezu otvara pregled, Ctrl+click otvara notu; Open beside prikazuje cilj u drugom Split panelu. Plava strelica vraća prethodnu notu, tab foldera i oba panela/režim. Kratak trag navigacije živi samo u tekućoj sesiji, ne u cloud sadržaju niti browser skladištu. Mentions dodaje All notes/Manuscript i pretragu referenci. Nema novih tipova entiteta, AI-ja ni izmene šeme; store ostaje v8. Provere: note-workflow, React note-link-dialog, postojeće editor/link/cloud regresije, TypeScript i produkcijski build; browser QA samo na sintetičkom projektu.

> **Integrisana celina 0.3.0:** objedinjeni rad na aliasima, stabilnim inline vezama i povratnim referencama sa paralelnim GitHub izmenama: per-occurrence Codex linkovi sa izborom cilja/preskakanjem, tabovi foldera i Timeline. Timeline poštuje aktivnu sekciju i folder; otvaranje reference zadržava Write/Split režim. Izvoz nudi izbor Binder nota i odvojeno čitljivu kopiju svih sekcija. Postojeća istorija i sadržaj projekata ostaju sačuvani.

> **14.11.2026 — Važeći proizvodni smer:** postojeći Katchamak razvijati kao autorski studio bez ugrađenog AI-ja: slobodne note, rukopis i Codex, stabilne veze i povratne reference, jednostavna navigacija i izvoz. Korisnik je odobrio samostalno sređivanje na osnovu ranijih ideja, uz očuvanje podataka i postojećeg dizajna. PRODUCT_DIRECTION.md beleži pregledane izvore i granice aktuelne nadogradnje. Verzija 0.3.0, store v8 (opcioni aliasi); cloud ostaje dok korisnik ponovo ne odobri lokalnu fazu.

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
