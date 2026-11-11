# Katchamak na Windowsu

Glavni lokalni projekat je `C:\Katchamak`, povezan sa privatnim repozitorijumom
`moranabloodline-cloud/katchamak`. Koristi postojeći Next.js/React kod, uz Tauri 2
omotač. Dashboard, Binder, Codex, Inspector i editor ostaju ista aplikacija.

## Pokretanje

`Start-Katchamak.cmd` otvara izgrađeni Windows program iz
`src-tauri\target\release\katchamak.exe`. Ne zahteva Node, Bun, Git, razvojni
server, ChatGPT nalog ili internet. Instalacioni paket nalazi se u
`src-tauri\target\release\bundle\nsis`; sadrži i offline WebView2 installer.

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

Rukopisi se i dalje čuvaju kroz postojeći Zustand/localStorage sistem i njegove
migracije. Gotova aplikacija ima sopstveni WebView2 korisnički profil izvan
`C:\Katchamak`. Stabilni identifikator `com.katchamak.desktop` ne menjati između
izdanja. Druga instanca aktivira postojeći prozor, radi izbegavanja paralelnog
pisanja u istu biblioteku.

GitHub sadrži izvorni kod, ne korisničke rukopise. U Git ne ulaze WebView2 profil,
`user-projects/`, `vaults/`, `backups/`, `.env*`, kredencijali i generisani buildovi.
Izvoz projekta u JSON i uvoz ostaju postojeće funkcije aplikacije. Git push nije
backup rukopisa. Kolekcije i njihove korice/preference su zaseban lokalni store;
postojeći pojedinačni JSON izvoz projekta ih ne sadrži.

Postojeći Sites/browser podaci ne mogu se automatski čitati iz desktop profila.
Za prenos otvoriti stari sajt u istom browser profilu, izvesti svaki projekat kroz
**Export backup**, sačuvati JSON izvan repozitorijuma i uvesti ga kroz **Import**
u gotovoj desktop aplikaciji. Stari profil i podatke čuvati dok se uvezene beleške
ne provere. Ova migracija ne briše niti prepisuje postojeće rukopise.

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
