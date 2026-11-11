# Katchamak

Privatna pisalačka radionica: Next.js / React / TypeScript. Autoritativni izvor aplikacije je ovaj GitHub repozitorijum. Pre rada pročitati `AGENTS.md`, `PROJEKT-KONTEKST.md`, `PROJECT_STATUS.md` i `KACHAMAK-ARHITEKTURA.md`.

## Pokretanje i provere

Koristiti Bun 1.3.4 i postojeći lockfile:

```sh
bun install --frozen-lockfile
bun run dev
```

Razvojni server ispisuje lokalnu adresu. U managed Sites okruženju pokretanje Preview-a ide preko `sites-preview start /workspace/katchamak`. Za pregled u razgovoru postoji Kachamak alat `open_novel_studio`: on otvara trenutno objavljenu aplikaciju sa iste Sites adrese kao samostalni sajt.

```sh
bun run tests/rehydration.test.mjs
bun run tests/library.test.mjs
bun run typecheck
bun run build
```

`typecheck` proverava aplikaciju; samostalni primeri iz `examples/` i tuđe veštine iz `skills/` nisu deo aplikacije. GitHub Actions izvršava ove provere i proveru izgrađenog paketa.

## Jedna verzija za pregled, sajt i nastavak rada

1. Pre izmene proveriti najnoviji `origin/main`. Raditi na postojećoj aplikaciji; sačuvati istoriju i tuđe izmene.
2. Izmenu prvo pregledati u razvojnom Preview-u i dobiti Nikolaovo odobrenje za objavu, osim kada njegov trenutni zahtev već nalaže objavu/usaglašavanje sajta.
3. Završiti provere, ažurirati status, napraviti commit i push na GitHub `main` bez force-pusha.
4. Iz tog commita pokrenuti `bun run build`, zatim `bun run check:release`. Provera odbija paket sa drugog commita, sa drugačijim izvornim fajlovima ili sa necommitovanim izmenama aplikacije.
5. Sačuvati isti sadržaj izvornog koda u postojećem Sites source repozitorijumu i objaviti upravo provereni `dist/` paket kroz Sites, uz postojeći `project_id` iz `.openai/hosting.json`. Sites source commit ima svoju istoriju; aplikacija u paketu beleži GitHub commit i kontrolni zbir izvornog koda. Ne praviti zamenski Site i ne menjati publiku sajta.
6. Proveriti uspeh objave i `/api/app-version`, pa otvoriti Kachamak alat u razgovoru. Njegov odgovor i ista HTTP ruta prikazuju `sourceCommit`, `sourceTree` i `appBuild`/`buildId`; moraju odgovarati proverenom paketu. Posle objave ponovo otvoriti prikaz da stari iframe ne ostane na ekranu.
7. Predati Nikola-i URL i GitHub commit. Lokalni screenshot, commit bez push-a i Sites save bez deploy-a nisu potvrda završenog objavljivanja.

`scripts/source-version.mjs` računa kontrolni zbir aplikacionih ulaza. `scripts/check-sites-build.mjs` proverava paket, početnu stranicu i isti MCP alat kojim se otvara prikaz u razgovoru. `/api/app-version` postoji i na razvojnom serveru; Sites paket dodatno sadrži `app-version.json`.

## Podaci i pristup

Rukopisi i kolekcije trenutno ostaju u browseru. Baza nije potrebna za pokretanje aplikacije niti za usaglašavanje koda na Preview-u i sajtu. Hosting konfiguracija i adapter moraju ostati u repozitorijumu. Kredencijali za GitHub/Sites ostaju izvan repozitorijuma i build paketa; novi saradnik koristi sopstveni odobreni pristup tim servisima.
