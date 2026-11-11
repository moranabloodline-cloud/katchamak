# Katchamak na Windowsu

Glavni lokalni projekat je `C:\Katchamak`, povezan sa privatnim repozitorijumom
`moranabloodline-cloud/katchamak`. Koristi postojeći Next.js/React kod, uz Tauri 2
omotač. Dashboard, Binder, Codex, Inspector i editor ostaju ista aplikacija.

## Pokretanje

`Start-Katchamak.cmd` otvara izgrađeni Windows program iz
`src-tauri\target\project-files\release\katchamak.exe`. Ne zahteva Node, Bun, Git, razvojni
server, ChatGPT nalog ili internet. Instalacioni paket nalazi se u
`src-tauri\target\project-files\release\bundle\nsis`; sadrži i offline WebView2 installer.

Za razvoj otvoriti `Develop-Katchamak.cmd`. On koristi lokalni `.tools\bun.exe`
ako postoji, inače Bun iz PATH-a, i pokreće Tauri razvojni prozor i automatiku.
Razvojni alati i zavisnosti se preuzimaju pri prvom podešavanju. Rust/Cargo i
Microsoft C++ Build Tools potrebni su samo za izgradnju, ne za korišćenje programa.

```powershell
cd C:\Katchamak
.\.tools\bun.exe install --frozen-lockfile
.\.tools\bun.exe run desktop:dev
.\.tools\bun.exe run verify
.\.tools\bun.exe run desktop:build
```

Na drugom računaru instalirati Bun, Rust sa MSVC toolchainom i C++ Build Tools,
pa koristiti `bun` umesto `.\.tools\bun.exe`. `postinstall` generiše postojeći
Prisma klijent za proveru tipova; aplikacija ne koristi bazu za rukopise.

`bun run dev` pokreće lokalni web pregled na `127.0.0.1:3000` i automatiku.
`bun run build` pravi samostalne statične fajlove u `out` sa lokalnim fontovima.
`bun run start` služi taj lokalni build. Za web pregled uvek koristiti isti
hostname i port, jer browser vezuje podatke za origin. Tauri razvojni i gotov
prozor imaju odvojene origine/profil podatke; stvarne rukopise koristiti u
gotovoj aplikaciji i prenositi JSON backupom.

## Sačuvani projekti i GitHub

Od verzije **0.2.2**, nova instalacija počinje praznom bibliotekom i bez unapred upisanog autora. Privatni primeri više nisu deo aplikacije ili instalera.

Svaki korisnički projekat je zaseban folder na lokaciji koju korisnik bira:

```text
D:\Moji rukopisi\Naziv projekta.katchamak\
  project.json       ← rukopis, Binder, Codex, Synopsis, Notes, Trash i metapodaci
  project.json.bak   ← prethodna uspešno sačuvana verzija
```

**Project** otvara obrazac za naziv i autora, a zatim Windows izbor lokacije. Projekat se dodaje u biblioteku tek kada njegov folder i fajl uspešno nastanu. Otkazivanje izbora ne pravi prazan projekat u biblioteci. **Open** otvara `project.json` iz postojećeg `.katchamak` foldera. Aplikacija pamti putanje u `%LOCALAPPDATA%\com.katchamak.desktop\recent-projects.json`; svaki ulazak u projekat i ponovno pokretanje učitavaju stvarni fajl sa diska.

Izmene se automatski čuvaju u projektni fajl posle kratkog mirovanja. **Save** odmah završava upis. Pri zatvaranju se prvo čeka da upis uspe; greška ostavlja prozor otvoren radi oporavka. Upis koristi privremeni fajl i zamenu tek nakon uspešnog upisa, uz prethodnu `.bak` kopiju. Ako je fajl u međuvremenu izmenjen drugim programom, aplikacija prijavljuje konflikt i čuva izmene za oporavak umesto prepisivanja.

Projekat se može ukloniti iz biblioteke bez brisanja njegovog foldera. Ponovo se otvara pomoću **Open**. Nestao ili premešten fajl ne zamenjuje se starom keširanom kopijom; korisnik bira njegovu novu putanju.

WebView2/localStorage sada služi kao lokalni keš za oporavak i podešavanja, a projektni fajlovi su glavni izvor rukopisa. Pre zamene keša sadržajem fajlova prethodna sesija se, ako se razlikuje, čuva u `%LOCALAPPDATA%\com.katchamak.desktop\recovery`. Te kopije mogu se ponovo otvoriti kroz **Open**. Stabilni identifikator `com.katchamak.desktop` ne menjati između izdanja.

Pri prvom pokretanju preko stare verzije, postojeća biblioteka ostaje sačuvana. Prikazuje se **Choose a folder for your projects**: korisnik bira lokaciju, a svaki postojeći projekat dobija sopstveni folder uz očuvanje ID-a, teksta i metapodataka. Otkazivanje ništa ne briše. Do izbora lokacije stari podaci ostaju zaštićeni od daljeg uređivanja.

**Import** zadržava uvoz JSON backupa, ali u desktop aplikaciji traži lokaciju za novi projektni folder pre dodavanja u biblioteku. **Export backup** i dalje pravi samostalni JSON backup. Kolekcije i preference biblioteke ostaju zasebna lokalna podešavanja; pojedinačni projekat sadrži svoje naslovne podatke i rukopis.

GitHub sadrži izvorni kod. Korisnički folderi, putanje, recovery kopije i rukopisi ne ulaze u Git niti u installer. Izbor projektnog foldera unutar izvornog repozitorijuma je blokiran. Build proverava odsustvo ranijih privatnih početnih projekata i izostavlja interne razvojne dokumente iz distribucije. Stari installer 0.2.1 sa privatnim primerima sklonjen je u ignorisani `.desktop-runtime/private-artifacts`; ne koristiti ga za deljenje.

Za prenos podataka sa starog Sites-a izvesti projekte kroz **Export backup** i uvesti ih kroz **Import** u desktop aplikaciji, birajući lokacije izvan izvornog koda. Stari browser profil čuvati do provere prenosa.

## Automatsko verzionisanje

Razvojne komande pokreću `scripts/desktop-sync.mjs watch`. Posle 30 sekundi bez
izmena proveravaju se tipovi, postojeći testovi čuvanja i biblioteke, testovi Git
automatike, statički build sa lokalnim assetima i nativni Tauri build. Tek tada
nastaju commit i običan fast-forward push na `origin/main`. `save:verified`
pokreće isti postupak odmah; `sync:watch` ga pokreće zasebno. Fajlovi se čuvaju
lokalno odmah tokom uređivanja, pre Git provera.

Automatika radi samo na lokalnoj grani `main` i očekivanom čistom GitHub URL-u.
Ne objavljuje postojeće ručno staged izmene. Ako se fajl promeni tokom provere,
provera padne, ili je GitHub main promenjen, čuva lokalni rad i zaustavlja slanje.
Ne radi automatski pull, stash, reset, promenu grane ili force push. Promene
drugog saradnika treba svesno integrisati i ponovo proveriti. Bez interneta
uređivanje i aplikacija rade, a GitHub sinhronizacija prijavljuje grešku i ponavlja
pokušaj. Potvrđen lokalni commit čiji push nije uspeo ostaje za sledeći pokušaj.
Stanje i greške su u ignorisanom `.desktop-runtime/sync-state.json`.

Za višefajlni agentski zadatak koristiti `bun run sync:pause`, po završetku
`bun run sync:resume`. Automatika traje dok radi razvojna sesija ili zaseban
watcher. Gotova aplikacija ne pokreće Git i ne šalje korisničke podatke.
GitHub prijava na Windowsu čuva se u Git Credential Manager-u, izvan projekta.

## Prethodni Sites projekat

Hosting manifest, server adapter i istorija ostaju sačuvani radi povratka.
`bun run build:sites` eksplicitno pravi stari Sites paket; `dev:sites` je stari
razvojni tok. Desktop build ih ne izvršava. GitHub CI proverava desktop kod;
push više ne pokreće automatsku objavu na Sites. Postojeća objava ostaje dostupna.

Tehnička osnova: [Tauri sa Next.js](https://v2.tauri.app/start/frontend/nextjs/)
i [Windows preduslovi](https://v2.tauri.app/start/prerequisites/).
