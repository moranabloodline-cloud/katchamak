> **2026-11-13 — Popravka blokiranog ulaska zbog pune browser memorije:** preostali persist middleware profila i izgleda pokušavao je localStorage upis tokom cloud inicijalizacije i prekidao otvaranje biblioteke sa QuotaExceededError. Oba UI store-a sada koriste isključivo stanje učitano sa Account API-ja, bez browser cache-a. Stari browser podaci nisu brisani. Regresioni testovi pokrivaju zabranjen pristup browser storage-u i punu kvotu tokom cloud otvaranja, kreiranja, Save, refresh-a i rešavanja konflikta.

> **2026-11-13 — Cloud verifikacija uživo:** Sites cloud verzija objavljena uspešno; kreirana probna kolekcija i projekat, unet tekst i kliknut Save. Drugi otvoreni prikaz automatski je dobio isti projekat i tekst; izmena iz drugog prikaza ostala je nakon punog reload-a prvog. Account Storage prikazuje samo cloud bez root/picker kontrole, svih osam vlasničkih tabova dostupno. Probni projekat „Provera cloud čuvanja” je privatno sačuvan na korisnikovom nalogu kao dokaz provere. About provera ažurnosti koristi stvarni sourceTree, izgled se čuva po nalogu i whitelist testovi prolaze.

> **2026-11-13 — AKTUELNO: isključivo Sites cloud čuvanje (izričita promena korisničkog zahteva).** Lokalni root/folder picker i memorijski Preview režim uklonjeni su iz aktivne aplikacije. D1 `cloud_libraries` čuva privatni indeks i revision po autentifikovanom nalogu, R2 privatne nepromenljive snimke biblioteke i priloge. Dashboard, kolekcije, svih šest sekcija i Save koriste isti API u Preview-u i browseru. Automatsko čuvanje i osvežavanje; konflikt drugog prozora zaustavlja upis bez gubitka otvorenih izmena. Account obuhvata Profile, Appearance, Membership, Security, Notifications, Storage, About i Admin za vlasnika. Postojeći fajlovi na računaru nisu brisani niti automatski uvezeni. Za lokalne projekte kasnije se pravi poseban razvojni zadatak. Raniji zapisi o root folderima ispod su istorija, ne važeća arhitektura. GitHub ostaje backup izvornog koda, bez korisničkih projekata. Provere: TypeScript; cloud API i klijent, izolacija naloga, CSRF, Unicode tekst, prilozi, čitanje novijih izmena, konflikti i oporavak posle neuspešnog upisa; migracije postojećih šema i Sites produkcijski build. Automatske provere sada koriste cloud build; Windows installer samo na ručno pokrenutom CI workflow-u.

# PROJECT_STATUS — Kachamak

> **2026-11-13 — Neuspešan izbor root-a u Preview-u, potvrđeno ograničenje:** native showDirectoryPicker ostaje bez odgovora i u minimalnoj top-level test stranici ovog hosta. Lokalni HTTP i iframe konektor nisu dobili potreban pristup iz javnog Preview-a i nisu zadržani kao rešenje. Choose library root sada prikazuje čekanje, nakon 5s jasno kaže da root NIJE izabran ili sačuvan, nudi Cancel i ostavlja postojeći root netaknut. Cancel ignoriše kasni rezultat i zatvara pomoćni permission prozor. Stvarno čuvanje writable root-a u ovom Preview hostu NIJE potvrđeno; obični Chrome/Edge tok i per-account IndexedDB ostaju neizmenjeni. Ispravljen i CRLF packaging problem uz node --check generisanog Worker-a.

> **2026-11-13 — Stvarni folderi u ugrađenom prikazu:** ukinuto automatsko pokretanje zasebne memorijske biblioteke kada picker nije dostupan i uklonjeno Load library for Preview iz normalnog interfejsa. Isti Dashboard i isti storage adapter koriste stvarne directory handle-ove. Cross-origin iframe otvara top-level permission prozor sa istog origin-a; proveravaju se origin, source, nonce i isti prijavljeni nalog, zatim se granted handle vraća Preview-u i pamti po nalogu. SecurityError/NotAllowedError direktnog pickera nudi isti tok. Otkazivanje ne stvara kolekciju. Povratak u prozor ponovo čita isti vault bez zamene nesnimljenih izmena i uz očuvanu lokaciju. Status prazne biblioteke više ne tvrdi da je nešto sačuvano. Jedinični testovi: dozvole, poruke, izolacija, disk reload, kreiranje, prava lokalna struktura. Ograničenje verifikacije: cloud Chrome je i u top-level testu odbio native picker sa NotAllowedError; stvarna Windows ChatGPT host podrška nije potvrđena i ne tvrdi se da je platformska blokada uklonjena.

> **2026-11-13 — Prijava:** Sites zahteva ChatGPT prijavu. Lokalni folderi vezani su za platformski user ID na tom browseru i uređaju. Novi nalog počinje prazno; stari anonimni profil se ne prisvaja. Account prikazuje email i odjavu nakon čuvanja. Testovi proveravaju anonimni pristup i izolaciju dva naloga.
> **2026-11-13 — Ista biblioteka u Preview-u:** dodat Load library for Preview preko directory inputa. Fajlovi se čitaju lokalno u memorijsku radnu kopiju kroz isti loader i isti UI; nema upload-a ili browser perzistencije rukopisa. U Preview-u izmene idu samo u memoriju, Save izvozi project JSON backup-e i status to jasno prikazuje; beforeunload štiti neizvezene izmene. Normalni vault handle i fajlovi ostaju netaknuti. Test pokriva učitavanje realne biblioteke, iste kolekcije/projekte, uređivanje, nezavisnost diska i povratak normalnom root-u.

> **2026-11-13 — Jedan library root po nalogu:** Account → Storage nudi Choose library root i prikazuje naziv foldera. Bira se jednom; sve nove kolekcije i projekti se automatski gnezde u vault. Novi registry ključ po nalogu čuva samo root handle; stari višestruki koreni ostaju sačuvani ali se ne prisvajaju. Save koristi postojeću dozvolu i traži obnovu samo kada browser više ne daje pristup; ne otvara ponovo picker. Testovi proveravaju više kolekcija i root projekat uz jedan izbor, reload, dozvole, premeštanje, privatnost i odvojene naloge.

> **2026-11-13 — Account Settings i Admin:** Profile sa avatarom i imenom, Membership sa serverskom licencom, Security preko ChatGPT prijave, Notifications sa sačuvanim preferencijama bez email slanja, Storage. Admin određen serverskim KATCHAMAK_ADMIN_EMAIL (vlasnik Sites-a), member nema admin API pristup. D1 čuva isključivo profile, licence i audit, nikada rukopise ili lokalne putanje. Admin može dodeliti lifetime/vremensku licencu po emailu, opozvati licencu, suspendovati/vratiti pristup. Vlasnik je zaštićen. Dodate schema-only Drizzle migracije i testovi autorizacije, CSRF-a, licenci i izolacije naloga. Naplata i automatske pretplate još nisu uključene.

> **2026-11-13 — Prijava i izolacija biblioteke:** Sites zahteva ChatGPT prijavu pre serviranja aplikacije. /api/account vraća identitet iz platformskih headera, bez keširanja. Lokalni direktorijumi u IndexedDB-u vezani su za taj ID, svaki nalog počinje prazno i pamti samo sopstvene dozvole na konkretnom browseru/uređaju. Stari anonimni profil se ne prisvaja automatski. Account omogućava odjavu nakon uspešnog čuvanja. Testovi pokrivaju anonimni pristup, razdvajanje dva naloga i povratak na sopstvene foldere.

> **2026-11-13 — Kreiranje kolekcije:** čuvanje najpre proverava izabrani folder bez pregledanja drugih foldera na lokaciji. Test pokriva nedostupne susedne foldere i preimenovanje.

> **2026-11-13 — Sites Save popravka:** preneta GitHub ispravka pronalaženja foldera po ID-u posle preimenovanja u Exploreru. Save i Retry save obnavljaju dozvolu za upis bez ponovnog učitavanja ili gubitka otvorenih izmena. Test lokalnih foldera potvrđuje oba slučaja, Markdown, priloge, premeštanje i zaštitu od spoljnih izmena. TypeScript provera prolazi.

> **2026-11-12 — Save posle preimenovanja foldera:** usklađen desktop Account 0.2.4 sa novom web bibliotekom. Pri čuvanju se folderi ponovo pronalaze preko ID-a u metapodacima, bez učitavanja stare verzije preko trenutnih izmena. Naziv foldera ostaje nezavisan od naslova projekta/kolekcije. Testovi na disku proveravaju preimenovanje projekta i roditeljske kolekcije u Exploreru, zatim Save i premeštanje uz očuvane priloge.

> **2026-11-12 — Oporavak nedostupne putanje pri Save:** traka greške omogućava Save current edits to a new folder. Čuva trenutni rukopis sa istim ID-em u novom izabranom folderu i ažurira putanju; ne učitava stariju disk kopiju preko nesnimljenih izmena.

> **2026-11-11 — Account Settings (0.2.4):** Account padajući meni prema referenci; Profile sa lokalnom fotografijom, prikazanim imenom i pseudonimom za nove projekte. Appearance: Dark/Light i Small/Normal/Large sa čuvanjem. Storage & Backup: podrazumevani folder preko Browse, automatske kopije izvan izvornog koda (do 20 verzija po projektu), Open backups folder; postojeći izvoz JSON-a ostaje u menijima projekta. About: stvarna verzija, provera javno dostupnog izdanja na klik, lokalne novosti i informacije o licenci. Privatni GitHub nema javni update feed; aplikacija to jasno prikazuje, bez ugrađenih kredencijala ili obaveznog interneta. Postojeći rukopisi i njihove migracije nisu menjani.

> **2026-11-11 — GitHub 0.2.3 + web biblioteka sa lokalnim folderima:** Sites služi praznu aplikaciju. Lokalni profil pamti samo lokacijske File System Access dozvole/handle-ove u IndexedDB-u; rukopisi i kolekcije nisu u localStorage-u. Svaka nova top-level kolekcija/projekat pita gde da napravi folder; sadržaj kolekcije se gnezdi bez novog pitanja. Kolekcije su folderi, projekat ima project.json, Notes/*.md i Files. Sadržaj se pri otvaranju čita sa diska. Desktop čuvanje ostaje aktivno samo pod Tauri-jem. Testovi pokrivaju različite korene, gnežđenje, Markdown, prateće fajlove, ponovno učitavanje, neuspešan upis/ponavljanje, premeštanje, promociju pri uklanjanju kolekcije, privatnost i obnovu dozvole. Cloud browser blokira showDirectoryPicker (NotAllowedError), pa sistemski dijalog nije potvrđen uživo; UI pregled i TypeScript su provereni. Lokacije pripadaju profilu konkretnog browsera, bez cloud sinhronizacije naloga.

> **2026-11-11 — Help Center na Dashboardu (0.2.3):** Help sada otvara padajući panel prema referenci, sa pretragom, grupama Learn Katchamak / Your Projects / Support & Feedback, What’s New i About. Stavke otvaraju lokalne članke u istom panelu, uz povratak na listu. Panel se zatvara preko X, Escape ili klika izvan njega; pretraga se resetuje po zatvaranju. Windows vizuelna provera potvrdila je raspored, filtriranje i otvaranje članka bez interneta. Čuvanje projekata nije menjano.

> **2026-11-11 — Projekti odvojeni od aplikacije (0.2.2), lokalno provereno:** uklonjeni privatni početni projekti i podrazumevani vlasnik iz aplikacije. Nova instalacija počinje prazno. Desktop projekti su zasebni `.katchamak` folderi sa `project.json`; biblioteka pamti samo putanje. Dodati izbor lokacije, Open, automatsko čuvanje, upis pri zatvaranju, prethodna `.bak` kopija, recovery i prenos postojeće biblioteke bez brisanja. Rukopisi i stari WebView2 profil nisu menjani tokom razvoja. Detalji u DESKTOP.md.

> **2026-11-11 — Windows desktop migracija pripremljena i lokalno proverena:** postojeći GitHub kod iz `c703f1e` preuzet u `C:\Katchamak`; prethodna lokalna Sites istorija sačuvana na `sites-history-preserved`, izvorna radna kopija nije menjana. Dodati Tauri 2 omotač, lokalni fontovi, samostalni statički build i automatika koja proverava pre commit/push-a bez automatskog prepisivanja rada. Podaci i store migracije nisu menjani. Detalji u DESKTOP.md; TypeScript, svi postojeći testovi, novi testovi automatike, offline asset provera i nativni release build prošli su. Napravljen Windows NSIS installer (212 MiB) sa offline WebView2 paketom. GitHub commit/push se izvršava po završetku ovih provera.

> **2026-11-11 — OBJAVLJENO: Tačka 7 (Inspector reorg) na GitHub `main`.** Commit `e3045257e263d8353710e18e424aa04ffc19c1d9` push-ovan fast-forward (`fea7ee0..e304525`, bez force-a) i verifikovan na remote-u. GitHub Actions automatski gradi i objavljuje na postojećem Sites-u; identitet objave potvrđen na sajtu: `/api/app-version` i `/app-version.json` vraćaju `sourceCommit` `8c10d1cd93fc06125312dd857a42afd5f3f687ac` i `sourceTree` `68e11ebf77a2e33e1e953808ce1d9210a4e73d14529f45d9d8da17ca6c34dc3f` (sadržajni hash aplikacionih ulaza — identičan lokalnom buildu i CI-ju), `dirty:false`. Push urađen iz GLM okruženja; token isključivo u `~/.git-credentials` (0600), remote URL čist.

> **2026-11-11 — AUTOMATSKO USAGLAŠAVANJE UKLJUČENO.** GitHub `main` je glavni izvor. `bun run dev` preuzima najnoviji kod i pokreće automatski commit/push završenih izmena posle provera; za postojeći server pokrenut je `sync:watch`. Pre višefajlnih agentskih izmena koristiti `bun run sync:pause`, po završetku `bun run sync:resume`. GitHub Actions automatski proverava, gradi, objavljuje aplikaciju na postojećem javnom Sites-u i proverava stvarni HTML/JS/CSS. Stvarna oblačna objava i provere prošle su za commit `42ecfbb` / run `42998803144`. Sites adapter v172 koristi R2 isključivo za pakete aplikacije i GitHub OIDC autorizaciju bez servisnih tokena. Otvoreni prikazi proveravaju novu verziju na 15s; lokalni kod proverava GitHub na 30s, uz recovery granu i stash pre preuzimanja tuđeg koda. Promene samog hosting adaptera traže native Sites objavu; uobičajene izmene aplikacije su automatske. Detalji i stanje su u `README.md` i `.openai/release.json`.

> **2026-11-11 — OBJAVLJENO: Dashboard biblioteka, Sites verzija 171.** Nikola je izričito odobrio objavu verzije 171. Novi Dashboard i provera identiteta objave su na GitHubu (`10691ff7c50d2c41f97e60dfd4eddf9156c01a0d`). Sites potvrđuje uspešnu objavu; Kachamak alat za otvaranje u razgovoru vraća isti `sourceCommit`, `sourceTree` i build kao provereni lokalni paket. Sajt: https://nikola-novel-studio.morana-bloodline.chatgpt.site . Uputstvo za nastavak rada je u `README.md`, a identifikatori objave u `.openai/release.json`. Starije beleške ispod o čekanju odobrenja opisuju prethodni korak i više nisu aktuelni status.

> **2026-11-11 — Dashboard biblioteka, lokalna verzija za pregled:** uklonjeni banner i „My Collections“. Dodati hijerarhija kolekcija, folderi i vertikalne korice, drag & drop između stabla i biblioteke, zaštita od ciklusa, putanja za navigaciju i nezavisni skroleri. Širina levog panela, Grid/List, zoom korica i otvorena lokacija se pamte. Collections store v2 migrira postojeće kolekcije bez promene ID-eva i članstava; manuscript store v6 i Workspace nisu menjani. **Objava na Sites-u i GitHub push čekaju Nikolino odobrenje po trenutnom zahtevu.** Lokalni browser testovi i build prolaze; TypeScript ima samo dve postojeće greške u `examples/websocket`. Sites razvojni Preview blokiran je greškom relay-a (`timed out waiting for relay readiness`); deljeni browser alat prijavljuje grešku sandbox-a. Automatske browser provere i screenshot urađeni su lokalno, u izolovanim testnim kontekstima.

> **2026-11-10 — Dashboard kompozicija:** široki hero koristi ambijent iste originalne slike na bočnim delovima, dok jasna slika ostaje cela. Visina je ograničena na 38vh / 400px; kolekcije imaju uži panel, a kartice projekta kompaktnije proporcije i prilagodljiv broj kolona.

> **2026-11-10 — Ctrl + skrol:** Dashboard koristi nativni wheel listener sa passive:false; Ctrl + skrol menja uvećanje istog prikaza koji kontrolišu dugmad. Običan skrol ostaje neizmenjen. Provere pokrivaju smer, trackpad, wheel jedinice i uklanjanje listenera.

> **2026-11-10 — Pregledniji Dashboard:** visina bannera ograničena je prema visini prozora, uz celu sliku i očuvane proporcije; naslov je pomeren ulevo. Kontrole u gornjoj traci omogućavaju promenu uvećanja Dashboarda između 70% i 130%, sa povratkom na 100%.

> **2026-11-10 — Dashboard:** banner je proširen iza naslova i podnaslova uz očuvane proporcije cele slike; dugmad Collection i Project dobila su usklađen tamno-zlatni izgled, uz postojeće funkcije.

> **2026-11-10 — Provera Trash stavki pri uvozu:** backup koji sadrži stavku Trash-a sa nepoznatom sekcijom odbija se pre upisa, jer se takva stavka ne bi mogla vratiti. Dodate su provere odbijanja bez izmene postojeće biblioteke i uvoza i vraćanja ispravne stavke. Dijalog trajnog brisanja, otkazivanje i Restore provereni su i kroz probni interfejs.

> **2026-11-10 — Provera lokalnog čuvanja:** dugme Save ponovo pokušava da upiše podatke i proverava da li se sačuvani projekti poklapaju sa trenutnim podacima. U slučaju greške upozorava i upućuje na izvoz JSON backupa. Informacije o čuvanju ne tvrde da postoji zasebna recovery kopija; Vault još nije dostupan. Dodate su provere neuspelog i ponovljenog upisa.

> **2026-11-10 — Bezbedniji Trash:** trajno brisanje pojedinačne beleške traži potvrdu; nove obrisane beleške vraćaju se na ranije mesto među susednim beleškama. Starije stavke bez podatka o položaju i dalje se vraćaju na kraj. Verzija čuvanja je v6, uz očuvanje postojećih v5 podataka; dodate su provere čuvanja i vraćanja podataka.

> **2026-11-10 — Sačuvana prazna biblioteka:** primeri se učitavaju samo pri prvom korišćenju; postojeća prazna biblioteka se više ne popunjava automatski posle ponovnog učitavanja. Automatski su provereni prvi ulazak, prazna biblioteka i očuvanje postojećeg projekta; build i TypeScript provera su prošli.

> **2026-11-10 — Meni projekta:** sa Dashboarda se može izvesti JSON backup ili zatražiti trajno brisanje projekta uz potvrdu. Backup testnog projekta sa beleškom je izvezen i ponovo uvezen, a dijalog za brisanje proverava upozorenje; build i TypeScript provera prošli su na GitHub Actions.

> **2026-11-10 — Pretraga i bezbedniji uvoz:** pretraga projekta nalazi tekst u sadržaju, sinopsisu i beleškama, kao i po naslovu. Uvoz proverava osnovnu strukturu projekta i stabla pre čuvanja; neispravna datoteka se odbija bez menjanja podataka. Provereni su pronalaženje reči u tekstu i uvoz ispravnog i neispravnog probnog backupa; build i TypeScript provera prošli su na GitHub Actions.

> **2026-11-10 — Dashboard kolekcije i prikazi:** lokalne kolekcije (kreiranje, preimenovanje, uklanjanje kolekcije bez brisanja projekata, višestruko članstvo projekata), sortiranje, grupisanje po autoru, Grid/List i Help su povezani. Kolekcije se čuvaju odvojeno u browseru; postojeći pojedinačni JSON backup projekta ne sadrži kolekcije. Provereno u probnoj verziji: kolekcija i članstvo posle reload-a, prikazi, sortiranje, grupisanje i dijalog za bezbedno uklanjanje; build i TypeScript provera prošli su na GitHub Actions.

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

- **Tačka 8 — Toolbar dopune: URADENA I TESTIRANA (lokalno), commit + push slede prijavi** (detalji u Dnevniku).
- Kontinuitet i backup infrastruktura — **ZAVRŠENO 09.11.** (`AGENTS.md`,
  `PROJECT_STATUS.md`, `scripts/backup.sh`, dnevni cron u 03:00 — nakon
  restarta okruženja 11.11. cron ponovo kreiran kao **ID 524156**
  (stari 517453 je nestao sa starom sesijom), sigurnosni fix `.env`; sve
  verifikovano — vidi §6 i Dnevnik). Ovaj odeljak se puni novim započetim
  zadatkom, a prazni posle svakog završenog.

## 3. Šta je SLEDEĆE (po redu — „ajmo redom")

Tačke 1–8 završene (tačka 8 urađena i testirana 11.11. — detalji u Dnevniku). Sledeća je **tačka 9**:

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
| 6 | **Cron „Kachamak — dnevni backup", 03:00 (Europe/Belgrade)** | zaboravljena ručna kopija | konfigurisan (ID 524156, ponovo kreiran 11.11. nakon restarta okruženja) |

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

- **2026-11-13 — Preview koristi dozvolu stvarnog foldera:** zamenjen automatski memory fallback top-level permission handoff-om; dodate provere naloga/porekla i čitanje diska pri povratku u prozor. Native picker u cloud QA blokira host; ovaj test nije predstavljen kao uspešan.
- **2026-11-11 — Account 0.2.4:** povezana sva četiri taba sa lokalnim profilom, temom, veličinom, lokacijom i nezavisnim backup kopijama. Dodati testovi lokalnih podešavanja, oporavka pri neuspelom upisu, čuvanja rukopisa i provere izdanja; Rust proverava zadržavanje i izolaciju backup kopija.

- **2026-11-11 (okruženje — vraćanje na korenski raspored) — ZAVRŠENO:** nova sandbox sesija došla je prazna; repo kloniran sa GitHub-a (`abca6b1`) u podfolder `katchamak/`, pa **vraćen u koren radnog prostora `/home/z/my-project`** — dokumentovani raspored koji očekuju `scripts/backup.sh` (`cd /home/z/my-project`), `scripts/crop_bottom.py` (putanje ka `upload/` i `scripts/crops`), restore postupak i sve putanje u kontekst-dokumentima. Pri spajanju fascikli platforma je forsirala exec bit na `upload/download.png` (ostali fajlovi u `upload/` već imaju 755 u indeksu — platformski mount) — usklađen `update-index --chmod=+x`, **sadržaj svih Nikolaovih ulaznih materijala netaknut**. Posle vraćanja: build čist (build `0f192a23cbdb`), aplikacija served iz korena, backup skripta radi na pravom mestu (snapshot 32M, kopije u `download/` i `public/` osvežene, auto-backup commit `7bd1ba9` push-ovan). Kredencijal ponovo u `~/.git-credentials` (0600, van projekta), dnevni backup cron ponovo kreiran (ID 524156, 03:00 Europe/Belgrade) — stari je nestao sa starom sesijom.
- **2026-11-11 (tačka 8 — Toolbar dopune) — URADENO, LOKALNO TESTIRANO:** po spec §8 na postojećoj formatnoj traci (traka 2, dizajn nepromenjen) dodato: **Text Style dropdown ISpred font kontrola**, podrazumevano „Normal" (opcije: Normal, Heading 1–6, Quote — spec ne nabraja opcije, ovaj skup je predlog za potvrdu; primenjuje `formatBlock` na blok u kome je kursor/selekcija; Chrome-ov podrazumevani blok `div` tretira se kao Normal; dropdown prati blok selekcije kroz `selectionchange` + `queryCommandValue('formatBlock')`) i grupa **Copy, Delete, Link** odmah iza font kontrola (iza razdelnika, pre B I U S): Copy = `execCommand('copy')` nad selekcijom (ToolBtn već čuva selekciju preko `onMouseDown preventDefault`), Delete = `execCommand('delete')`, Link = `window.prompt` za URL (prazno/Esc = odustajanje) pa `createLink`. Store NIJE diran (nema promene šeme — stilovi žive u HTML sadržaju note). Verifikacija: `bun run build` čist (49 assets, build `103ae99c2d6f`); `bunx tsc --noEmit` čist (samo postojeće 2 greške u `examples/websocket`); production build na localhost:3000 kroz agent-browser: Text Style je prvi u traci; selektovan tekst → „Heading 1" daje `<h1>…</h1>`, „Normal" vraća `<p>`, dropdown se osvežava na promenu selekcije; Link ubacuje `<a href>` i sadržaj je sačuvan u store-u (provereno u localStorage); Delete briše selektovanu reč; Copy kroz stvarni klik (trusted gesture) vraća `execCommand('copy') = true` (sistemsko ograničenje headless-a: čitanje clipboarda van klika nije moguće, pa je proverena povratna vrednost komande). Screenshot-provera trake urađena (`/tmp/toolbar-crop.png`). Repo je pre zadatka sinhronizovan sa `origin/main` (`abca6b1`), kredencijal u `~/.git-credentials` (0600, van projekta).
- **2026-11-11 (tačka 7 — Inspector reorg) — OBJAVLJENO NA GITHUB:** po arhitekturi §11 završena reorganizacija desnog panela. **Info tab:** Synopsis i Notes vertikalno, svako polje skroluje svoj sadržaj nezavisno; između njih **draggable razdelnik** (1px linija, `role="separator"`, po defaultu 50%/50%, granice 15–85%, vuče se gore/dole — isti obrazac pointer-capture stilova kao postojeći vertikalni Resizer-i panela). Proporcija se čuva kao nova preferencija `infoSynopsisRatio` (`?? 0.5` za stare store-ove) i preživi reload. **Details tab:** sada povezuje notu sa **Codex notama** — lista „Linked Codex notes“ (ikona + naslov rešen uživo iz Codex sekcije pa se preimenovanja provlače; klik na red otvara Codex notu — prelazak na Codex tab + selekcija; X skida vezu; obrisana Codex nota ostaje kao „missing note“ dok se veza ne skine) + **pretraživi birač** „Link a Codex note“ (pretraga po naslovu, bez ove note i bez već povezanih, max 8 rezultata, klik povezuje i čisti polje). Osnovni podaci note (Type/Words/Created/Updated/Sub-notes) ostaju ispod veza — postojeći prikaz, ništa nije uklonjeno. **Store v6→v7:** `NoteNode.links?: string[]` (opciono polje, bez data migracije — stari store-ovi i backupovi ga jednostavno nemaju; `duplicateNode`, JSON eksport i import prenose veze automatski). Mentions tab i collapsible ponašanje panela nisu menjani (već postojali). Verifikacija: `bunx tsc --noEmit` čist; `bun run build` prolazi (49 assets, build `99ebfb402c18`); Playwright E2E (`scripts/verify_inspector.py`): vučenje razdelnika 50%→68.6%, persist posle reload-a, pretraga „dec“ → „Declan“, povezivanje, persist veze posle reload-a, klik na vezu → prelazak na Codex tab — **sve PASS**; screenshotovi u `scripts/inspector7/`. Nikola je odobrio trenutno stanje i naredio prenos na GitHub („sada treba da se apdejtuje i github — ako tamo ne bude ovo sada čemu sve ovo“). Push iz GLM okruženja: commit `e3045257e263d8353710e18e424aa04ffc19c1d9`, fast-forward `fea7ee0..e304525` na `main`, bez force-a; remote SHA verifikovan API-jem; identitet objave potvrđen i na sajtu — `/api/app-version` i `/app-version.json` vraćaju isti `sourceCommit` `8c10d1c…` i `sourceTree` `68e11ebf77a2e33e1e953808ce1d9210a4e73d14529f45d9d8da17ca6c34dc3f` kao lokalna CI-simulacija (sadržajni hash ulaza, `dirty:false`; napomena: `sourceTree` NIJE git tree hash vec sadržajni hash iz `source-version.mjs`). Uz Inspektor izmene, commit sadrži i `DashboardLibrary.tsx` iz trenutnog stanja (sklonjene Cover-size dugmadi, „Library“ dugme u sidebaru, Folder ikona uz naslov „Collections“) i ovu evidenciju. Sajt-side potvrdu identiteta daje Kachamak alat u razgovoru (`/api/app-version`) kada Actions objava stigne.
- **2026-11-11 (automatizacija razvoja i objave) — ZAVRŠENO:** uveden GitHub Actions → OIDC → R2 tok na istom Sites-u. Prihvata samo konfigurisan repozitorijum, `main` i workflow, proverava potpis, identitet i sadržaj, upisuje sve resurse pre atomske aktivacije, odbija starije workflow-e i zadržava prethodnu verziju pri neuspehu. Produkcioni prikaz učitava isti paket preko sajta i MCP iframe-a; proverava se nova verzija na 15s uz odlaganje tokom uređivanja/dijaloga/nesačuvanog postojećeg browser stanja. `sync-workspace` preuzima tuđe izmene sa `main`, prethodno čuva lokalne commitove u recovery grani i radni sadržaj u stash-u, bez force-pusha i izmene `upload/`. Završene lokalne izmene automatski proverava, commit-uje, gradi i push-uje. `bun run dev` uključuje ovu sinhronizaciju, a u postojećem okruženju pokrenut je zaseban watcher; pauza za agentski rad je dokumentovana. Unit testovi koriste stvarne RSA potpise i izolovane git repozitorijume; svi testovi i TypeScript/build prolaze lokalno i na GitHubu. Native Sites adapter v172 uspešno objavljen. Stvaran GitHub workflow `42998803144` samostalno je objavio commit `42ecfbb`, proverio učitane app reference i identične JS/CSS fajlove, a MCP potvrdio isti commit/build. Završna evidencija ide kroz lokalnu automatiku kao dodatna provera commit/push toka. R2 nije skladište korisničkih projekata. Konačan JSON sistem i prazna početna biblioteka su poseban kasniji zadatak po Nikolinoj odluci; u ovom zadatku nisu menjani editor, rukopisi ni njihov store.

- **2026-11-11 (usaglašavanje aplikacije, prikaza u razgovoru i GitHub-a) — ZAVRŠENO:** GitHub `main` ažuriran bez force-pusha. Novi Dashboard i kompletan postojeći aplikacioni kod preneti u postojeći Sites izvor, uz očuvanje njegove istorije i javnog pristupa. Aplikacioni commit `10691ff7c50d2c41f97e60dfd4eddf9156c01a0d`; Sites source commit `be5c47ddf955ac04668d2c5f58add0c03d778066`; objavljena verzija 171. `bun run typecheck`, rehydration i library testovi, build i `check:release` prolaze. Dodati `/app-version.json`, identitet source-a u Sites `/api/app-version` i u odgovoru `open_novel_studio`, provera izvornog koda/paketa pre objave, i uputstvo za preuzimanje i nastavak rada. Izmenjen postojeći GitHub Actions workflow da koristi istu proveru tipova aplikacije i proverava kolekcije i release paket. Posle prvobitnog odbijanja automatske provere, Nikola izričito odobrio objavu verzije 171; Sites deployment `appgdep_6af43201a9c08191885406f0e26e036a` uspešan. Poziv postojećeg Kachamak alata posle objave potvrdio source tree `1cfc2c7be69fc4a5d685b1dbdf94f126d83c9cbaa5a84aaeff554769e3cfd6e0` i build `347f181ec8264fc73516a739579933376382c925d8fdee81e7669b102f69f55c`, identične proverenom paketu. Baza podataka nije dodavana; rukopisi i editor ostaju na postojećem lokalnom sistemu. Završni commit dokumentacije beleži ovu objavu, bez izmene aplikacionog paketa.

- **2026-11-11 (Dashboard — biblioteka projekata) — SPREMNO ZA PREGLED, NIJE OBJAVLJENO:**
  `DashboardLibrary.tsx` prikazuje stablo podkolekcija/projekata i neposredni sadržaj otvorene lokacije. Root prikazuje glavne kolekcije i projekte bez kolekcije. Native DnD i alternativni „Move to“ meni premeštaju foldere/projekte između oba prikaza; ciklusi se odbijaju. Postojeće višestruko članstvo ostaje očuvano; premeštanje projekta u root uklanja članstva, a brisanje kolekcije promoviše njen sadržaj roditelju bez brisanja projekata. Kreiranje i uvoz koriste postojeće akcije; novi projekat se smešta u otvorenu kolekciju. Sačuvani su Account, Help, eksport, pretraga, sortiranje i grupisanje. Collections storage ključ ostaje isti, verzija je 2 uz v1 migraciju; nove UI preference imaju poseban ključ. Dashboard pri prvom prikazu koristi postojeći Save mehanizam da početni ID-evi projekata ostanu trajni pre povezivanja sa kolekcijama. Unit provere pokrivaju 50 nivoa, cikluse, migraciju, članstva, pomeranje, brisanje i reload. Browser provere pokrivaju oba smera DnD, root drop, Grid/List/zoom, promenu broja kolona, razdelnik i reload, nezavisno skrolovanje, legacy podatke, otvaranje starog i novog projekta, import/eksport, rename/delete i širine 390–1440px. `bun run build` prolazi; `bunx tsc --noEmit` prijavljuje samo nedostajuće socket.io pakete u dva postojeća websocket primera. Nije rađen Sites save/deploy ni GitHub push: čekaju Nikolaov pregled i odobrenje. Razvojni Preview u panelu nije dostupan zbog Sites relay/browser infrastrukture; lokalna aplikacija radi na portu 3000.

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


### 2026-11-11 — Dnevnik: prelazak na lokalni Windows razvoj

- Autoritativna radna kopija `C:\Katchamak`, postojeći GitHub main `c703f1e` i sačuvana Sites istorija; originalni checkout i upload materijali nisu menjani.
- Tauri 2, statični Next.js izvoz, fontovi sa postojećim unicode podskupovima i OFL licencom; desktop ne pokreće Sites adapter ni proveru oblačnih verzija.
- Izgrađeni `src-tauri/target/release/katchamak.exe` i NSIS installer sa offline WebView2 paketom. Single-instance čuva jedan aktivni prozor. Postojeći store i migracije ostaju isti.
- UI provera kroz Windows computer-use: pokretanje sa neispravnim HTTP proxyjem, prikaz Dashboarda, kreiranje probnog projekta i Binder beleške, postojeći editor/Inspector; odvojeni `.desktop-runtime/qa-profile` za test podatke. Dalji unos u prozor preuzeo je korisnik; ponovni start, JSON izvoz/uvoz i svi prikazi nisu zasebno proveravani kroz native UI. Čuvanje, rehidracija i import validacija provereni postojećim testovima.
- Prošli su `typecheck`, rehydration, library, dashboard-zoom, release-store, application-updates, workspace-sync, desktop-sync, statički build, check-desktop i nativni release build. Git test koristi LF u izolovanim checkout-ima radi Windows kompatibilnosti.
- Automatika radi tokom razvojne sesije, posle 30s mirovanja i punih provera, čuva korisnički rad pri remote konfliktu i nikada ne radi force-push. GitHub CI više ne objavljuje desktop izmene na Sites i dodatno gradi Windows installer.
- GitHub backup koda je odvojen od WebView2 rukopisa i JSON backupa. Sites podatke treba preneti postojećim JSON izvozom i uvozom. Detalji i komande u DESKTOP.md.

- **Dorada oporavka mreže:** regresioni test potvrđuje da odbijen push i naredni neuspešan fetch ne gube identitet proverenog lokalnog commita; posle povratka mreže šalje se isti commit bez dupliranja i bez slanja rukopisa.


### 2026-11-11 — Dnevnik: korisnički projektni folderi i prazna distribucija

- Uklonjen sadržaj privatnih početnih projekata iz aktivnog seed modula; postojeća biblioteka se ne briše. Nova instalacija ima nula projekata i praznog podrazumevanog autora. Interne dokumente desktop build više ne kopira u distribuciju; check-desktop odbija poznati privatni sadržaj.
- Nativni projekat je zaseban `.katchamak` folder sa `project.json`. Kreiranje traži lokaciju; Open i nedavne putanje čitaju stvarne fajlove. Registar u AppData sadrži ID i putanju, a ne ugrađene rukopise. Korisnički projektni folder unutar izvornog repozitorijuma je blokiran.
- Zasebni upisi koriste privremeni fajl, prethodnu `.bak` kopiju i proveru revizije radi zaštite od spoljnih izmena. Pri zatvaranju se završava upis; neuspeh ostavlja prozor otvoren. Keš je samo oporavak; prethodna sesija se bez prepisivanja čuva u AppData recovery kada se razlikuje od diska.
- Stara biblioteka dobija izbor lokacije i prenosi se u zasebne foldere sa očuvanjem ID-a i sadržaja. Otkazivanje prenosa ništa ne briše. Uklanjanje projekta iz biblioteke čuva njegov folder i omogućava ponovno otvaranje.
- Prošli novi testovi: prazna instalacija, otkazan izbor lokacije, prenos stare biblioteke, zaseban upis, ponovno otvaranje preko putanje, neuspešan upis i oporavak, uvoz i bezbedno uklanjanje iz biblioteke. Rust testovi rade sa stvarnim fajlovima: čuvanje/backup, ponovno čitanje registra, odbijanje zastarelog upisa i neispravnog stabla.
- Windows UI QA u izolovanom profilu i sa blokiranom HTTP mrežom: nova biblioteka prazna; izbor foldera pravi `Local files test.katchamak/project.json` u privremenoj korisničkoj lokaciji; beleška je automatski upisana u fajl. Posle zatvaranja, probna beleška promenjena je direktno na disku; ponovno pokretanje prikazuje novu vrednost sa diska, čime je potvrđeno da se ne otvara stara kopija iz keša. Korisnički projekti nisu korišćeni za testiranje.
- Stari installer 0.2.1 sa primerima izdvojen u ignorisani private-artifacts, nije za deljenje. Izvorni executable starog otvorenog programa ostavljen netaknut; novi build koristi `src-tauri/target/project-files`, a Start skripta i CI prate novu putanju.

- Build dodatno odbija korisničke projektne fajlove i arhive izvornog koda u distribuciji; source backup izostavlja runtime/profile/target foldere i korisničke projektne foldere.


### 2026-11-11 — Dnevnik: Dashboard Help padajući meni

- Zamenjen raniji Dashboard help dijalog panelom HelpCenter, vezanim za postojeće Help dugme. Tamna podloga, zaobljen okvir, žute ikonice, grupisane stavke i tipografija prate referencu.
- Lokalna pretraga filtrira naslove, opise i tekst članaka. Svih devet stavki imaju lokalni sadržaj; About prikazuje verziju iz package.json. Nije izmišljena adresa podrške niti se bilo šta šalje drugim servisima.
- Provereno u izolovanoj Windows aplikaciji uz blokiranu mrežu: otvaranje, vizuelni raspored svih stavki, pretraga keyboard, otvaranje članka Keyboard Shortcuts i zatvaranje Escape tasterom. TypeScript i statički build prolaze; sledi standardna završna provera, commit/push i installer.




