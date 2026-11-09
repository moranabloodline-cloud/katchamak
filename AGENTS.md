# AGENTS.md — Stalna pravila projekta Kachamak

> **OBAVEZNO PRVO ČITANJE U SVAKOJ NOVOJ SESIJI — PRE BILO KAKVE IZMENE KODA.**
> Ovaj fajl su stalna pravila projekta. Važi za svaku sesiju i svakog agenta
> koji radi na ovom kodu. Menja se **samo uz Nikolinu eksplicitnu saglasnost**.

---

## 1. Redosled čitanja na početku sesije (pre bilo kakve izmene)

1. **`AGENTS.md`** (ovaj fajl) — pravila ponašanja.
2. **`PROJEKT-KONTEKST.md`** — kontekst, detaljan status, postupak restore-a.
3. **`PROJECT_STATUS.md`** — aktuelni status: završeno / u toku / sledeće / odluke.
4. **`KACHAMAK-ARHITEKTURA.md`** — autoritativna specifikacija (dokument pobeđuje
   u sporu; Nikolaova trenutna reč pobeđuje sve).

Tek kad su pročitana sva četiri fajla, smije se raditi. Ako nešto ostaje
nejasno — **pitaj Nikolu, ne pretpostavljaj**.

## 2. Projekat u jednoj rečenici

**Kachamak** — privatna pisalačka radionica (Next.js 16 App Router + React +
TypeScript + Tailwind + shadcn/ui + Zustand, podaci u localStorage, store **v5**)
za roman **„Morana: Bloodline"**; gradi se piksel-po-piksel po Nikolaovim
screenshotovima i arhitektura dokumentu.

## 3. Tvrdi pravila (nikad se ne krše)

1. **Komunikacija isključivo na srpskom.**
2. **„Ajmo redom"** — tačka po tačka, strogo po redu, bez preskakanja.
3. **Zabranjene neistražene izmene.** Ništa „usput", ništa „pošto već tu sam".
   Sve po Nikolaovim rečima i screenshotovima **doslovno**. Njegova izjava:
   > „Ako ti ja budem davao slike i precizne instrukcije a ti budeš pravio ono
   > što ti želiš onda ova saradnja nema smisla... mislim da sam kristalno jasan"
4. **`upload/` je nediriv** — to su Nikolaovi ulazni materijali (screenshotovi,
   arhive, plugin.json). Nikad se ne menja, ne briše i ne preimenuje.
5. **Pre svake prijave Nikoli:** `bun run build` (mora proći) +
   `bunx tsc --noEmit` (greške su OK samo u `examples/` i `skills/`), pa
   screenshot-provera i prijava na srpskom, pa **čekaj potvrdu**.
6. **Promena šeme podataka = novi `version` u `src/lib/kachamak/store.ts` +
   nova migrate grana.** Postojeće migracione grane se nikad ne diraju
   (trenutno: v5, lanci v0→…→v5).
7. **Nikad ne prepisuj radni kod:**
   - izmene se rade **uređivanjem** postojećih fajlova, ne regeneracijom celog
     fajla od nule;
   - pre rizične izmene: obavezan **git commit** (ili `scripts/backup.sh`) da
     postoji tačka povratka;
   - stari kod se ne briše dok novi ne prođe build + Nikolinu potvrdu;
   - istorija (`git log`) se nikad ne rešava (nema rewrite-a istorije).
8. **Nikad ne objavljuj tajne:** `.env`, API ključevi, tokeni, `*.pem`, `*.key`
   — ne u git, ne u backup zipove, ne u javni folder `public/`. Backup skript
   ih automatski isključuje i proverava (`secrets-guard`); ovo je dodatna
   garantovana linija, ne izgovor.
9. **Posle SVAKOG završenog zadatka:** ažuriraj `PROJECT_STATUS.md`
   (status + „Dnevnik izmena") i uradi git commit sa smislenom porukom.

## 4. Backup i kontinuitet (kratko; detalji: PROJEKT-KONTEKST §0, PROJECT_STATUS §6)

- **Ručno / posle zadatka:** `bash scripts/backup.sh` — kreira
  `backups/kachamak-<datum-vreme>.zip` (bez `node_modules`, `.next`, `.git`,
  `backups/`, `tool-results/`, `download/`, `skills/` i **bez tajnih fajlova**),
  osvežava `download/kachamak-aplikacija.zip` (koplja za Nikolu) i
  `public/kachamak-aplikacija.zip` (cloud kopija koju servira preview
  deployment), rotira snapshotove (čuva poslednjih 12) i loguje u
  `backups/backup.log`.
- **Automatski:** cron zadatak „Kachamak — dnevni backup" poziva isti skript
  **svaki dan u 03:00 (Europe/Belgrade)**.
- **Git:** platforma sama radi checkpoint commitove; uz to se posle svakog
  zadatka radi commit sa smislenom porukom (pravilo §3.9).
- **Restore u novoj sesiji:** postupak je u `PROJEKT-KONTEKST.md` §0
  (cloud link → zip → `bun install && bun run build`), a rezervni put je
  Nikolaov zip iz `download/`.

## 5. Kraj sesije — checklist

- [ ] `bun run build` + `bunx tsc --noEmit` čisti
- [ ] `PROJECT_STATUS.md` ažuriran (status, dnevnik, odluke ako ih ima)
- [ ] `bash scripts/backup.sh` odrađen (ili barem git commit)
- [ ] prijava Nikoli na srpskom, sa čekanjem potvrde
