# Katchamak

> **Aktuelno od 11.11.2026:** razvoj je prebačen u `C:\Katchamak`, sa Tauri Windows aplikacijom, offline buildom i proverom pre automatskog commit/push-a. Uputstva u [DESKTOP.md](DESKTOP.md) imaju prednost nad istorijskim Sites tokom ispod. `dev`, `build`, `start` i `sync:watch` sada koriste desktop tok. Stari Sites adapter ostaje sačuvan; GitHub push više ne objavljuje na Sites.

Privatna pisalačka radionica: Next.js / React / TypeScript. Autoritativni izvor aplikacije je ovaj GitHub repozitorijum. Pre rada pročitati `AGENTS.md`, `PROJEKT-KONTEKST.md`, `PROJECT_STATUS.md` i `KACHAMAK-ARHITEKTURA.md`.

## Pokretanje i provere

Koristiti Bun 1.3.4 i postojeći lockfile:

```sh
bun install --frozen-lockfile
bun run dev
```

`bun run dev` prvo preuzima GitHub `main`, zatim otvara razvojni server i pokreće automatsku sinhronizaciju. Završene izmene posle 30 sekundi bez novih izmena prolaze provere, build i push; kod koji ne prođe provere ne objavljuje se. Nova verzija sa GitHuba ima prednost, uz povratnu granu i stash za lokalni rad. Za ručni rad bez automatike postoji `bun run dev:local`.

U managed Sites okruženju pokretanje Preview-a ide preko `sites-preview start /workspace/katchamak`. Pregled u razgovoru kroz Kachamak alat `open_novel_studio` i samostalni sajt učitavaju istu objavljenu aplikaciju. Otvorena aplikacija proverava novu verziju na 15 sekundi i osvežava se kada korisnik ne uređuje sadržaj i kada postojeće lokalno čuvanje potvrdi da nema nesačuvanih izmena.

```sh
bun run tests/rehydration.test.mjs
bun run tests/library.test.mjs
bun run typecheck
bun run build
```

`typecheck` proverava aplikaciju; samostalni primeri iz `examples/` i tuđe veštine iz `skills/` nisu deo aplikacije. GitHub Actions izvršava ove provere i proveru izgrađenog paketa.

## Automatski tok: GitHub → sajt i pregled

Nikola je 11.11.2026. zatražio i odobrio automatsko usaglašavanje aplikacije. GitHub `main` je autoritativni izvor. Svaki push na `main`, uključujući promenu drugog saradnika, pokreće `.github/workflows/build.yml`: testove, proveru tipova, build, proveru paketa, automatsku objavu i proveru stvarno objavljene verzije. Neuspeh zadržava prethodnu objavu.

Objava koristi kratkotrajni GitHub OIDC identitet, bez sačuvanih servisnih tokena. Sites prihvata samo ovaj repozitorijum, ovaj workflow i `main`. Potpuno provereni statični paketi smeštaju se u R2; aktivna verzija menja se tek nakon uspešnog upisa svih fajlova. Stariji workflow ne može da prepiše noviju objavu. R2 ne čuva rukopise niti projekte.

Pre uređivanja više fajlova u agentskom zadatku zaustaviti automatsko slanje, a po završetku ga ponovo uključiti:

```sh
bun run sync:pause
# završiti izmene i proveru
bun run sync:resume
```

Za već pokrenut razvojni server može se zasebno pokrenuti `bun run sync:watch`. Radi dok je radno okruženje aktivno; posle ponovnog pokretanja `bun run dev` prvo preuzima najnoviji `main`. GitHub Actions nastavlja objavljivanje i kada ovo okruženje ne radi. Stanje i eventualna greška su u ignorisanom `.sites-runtime/sync-state.json`. Nema force-pusha; lokalni rad pre preuzimanja tuđeg koda ostaje u `backup/autosync-*` grani i stash-u.

Aktivnu verziju proveriti preko `/api/app-version` ili Kachamak alata: `sourceCommit`, `sourceTree` i `appBuild`/`buildId` moraju odgovarati poslednjem uspešnom workflow-u. Kod za nastavak rada uvek preuzeti sa GitHub `main`.

Sites Worker je osnovni adapter za objavljivanje, odvojen od statične aplikacije. Promena samog adaptera, GitHub autorizacije ili Sites bindinga zahteva novu native Sites objavu sa istim `project_id` i publikom; workflow takvu promenu prepoznaje kroz `runtimeHash` i zaustavlja se umesto da potajno pokrene stari server. Uobičajene izmene stranica, komponenti, stilova, slika i klijentske logike objavljuju se automatski. Ne čuvati tokene u kodu niti menjati pristup sajtu radi objave.

Za ručno pakovanje nakon uspešne provere, arhiva mora sadržati manifest u korenu i Worker na putanji `dist/server/index.js`:

```sh
mkdir -p .sites-runtime
tar -czf .sites-runtime/katchamak-release.tar.gz .openai/hosting.json dist/server/index.js
```

`scripts/source-version.mjs` računa kontrolni zbir aplikacionih ulaza. `scripts/check-sites-build.mjs` proverava paket, početnu stranicu i isti MCP alat kojim se otvara prikaz u razgovoru. `/app-version.json` postoji na razvojnom serveru i na Sites-u; Sites dodatno izlaže `/api/app-version` sa identitetom paketa.

## Podaci i pristup

Rukopisi i kolekcije trenutno ostaju u browseru. Baza nije potrebna za pokretanje aplikacije niti za usaglašavanje koda na Preview-u i sajtu. Hosting konfiguracija i adapter moraju ostati u repozitorijumu. Kredencijali za GitHub/Sites ostaju izvan repozitorijuma i build paketa; novi saradnik koristi sopstveni odobreni pristup tim servisima.

Konačan sistem projekata (kasnija faza): nova aplikacija ima praznu biblioteku; projekti su zasebni JSON fajlovi na lokaciji koju bira korisnik. Kreiranje i uređivanje ne znače automatsko trajno čuvanje. Sadašnji browser store i početni primeri ostaju privremeni dok se taj sistem posebno ne implementira. Automatika u ovom zadatku odnosi se na kod i objavu aplikacije.
