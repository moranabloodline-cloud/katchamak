#!/usr/bin/env bash
# ============================================================================
# Kachamak backup — pokrenuti:  bash scripts/backup.sh
# Radi: (1) snapshot projekta u backups/ (bez tajni i teških foldera),
#       (2) secrets-guard — prekida ako je tajni fajl ušao u zip,
#       (3) integritet (unzip -t),
#       (4) osvežava download/kachamak-aplikacija.zip (kopija za Nikolu) i
#           public/kachamak-aplikacija.zip (cloud kopija na preview deploymentu),
#       (5) rotacija — čuva poslednjih 12 snapshotova,
#       (6) git commit svih promena (poštuje .gitignore — .env nikad ne ulazi),
#       (7) loguje u backups/backup.log.
# Kod aplikacije se NIJE menja ovim skriptom — samo se bekuje.
# ============================================================================
set -euo pipefail
cd /home/z/my-project

BACKUPS="backups"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
ZIP="$BACKUPS/kachamak-$STAMP.zip"
LOG="$BACKUPS/backup.log"
KEEP=12
mkdir -p "$BACKUPS"

# --- (1) snapshot -----------------------------------------------------------
# Isključeno: zavisnosti/build/git/sistemske fascikle i SVE potencijalne tajne.
zip -r -q "$ZIP" . \
  -x "node_modules/*" ".next/*" ".git/*" "$BACKUPS/*" "tool-results/*" \
     ".desktop-runtime/*" ".sites-runtime/*" ".tools/*" "src-tauri/target/*" "out/*" "dist/*" "user-projects/*" "vaults/*" "*.katchamak/*" "recent-projects.json" \
     "download/*" "skills/*" "agent-ctx/*" "public/kachamak-*.zip" \
     ".env" ".env.*" "*.env" "*.pem" "*.key" "*.p12" "*.pfx" \
     "*.log" "nohup.out" ".DS_Store"

# --- (2) secrets-guard ------------------------------------------------------
LEAK="$(unzip -l "$ZIP" | awk '{print $4}' | grep -E '^(|.*\/)\.env(\..*)?$|\.pem$|\.key$|\.p12$|\.pfx$' || true)"
if [ -n "$LEAK" ]; then
  echo "$(date '+%F %T') [ABORT] TAJNI FAJL U SNAPSHOTU: $LEAK — zip obrisan." >> "$LOG"
  rm -f "$ZIP"
  exit 1
fi

# --- (3) integritet ---------------------------------------------------------
if ! unzip -t -qq "$ZIP" >> "$LOG" 2>&1; then
  echo "$(date '+%F %T') [ABORT] korumpiran zip: $ZIP" >> "$LOG"
  rm -f "$ZIP"
  exit 1
fi

# --- (4) osveži kopije za Nikolu i za cloud (public/ servira deployment) ----
cp "$ZIP" "download/kachamak-aplikacija.zip"
cp "$ZIP" "public/kachamak-aplikacija.zip"

# --- (5) rotacija -----------------------------------------------------------
ls -1t "$BACKUPS"/kachamak-*.zip 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

# --- (6) git checkpoint (poštuje .gitignore; .env je izbačen iz indeksa) ----
if ! git config user.email >/dev/null 2>&1; then
  git config user.name  "Kachamak Backup"
  git config user.email "backup@kachamak.local"
fi
git add -A
if ! git diff --cached --quiet; then
  git commit -q -m "auto-backup $STAMP" || true
fi

# --- (7) log ----------------------------------------------------------------
echo "$(date '+%F %T') OK $ZIP size=$(du -h "$ZIP" | cut -f1) git=$(git rev-parse --short HEAD 2>/dev/null || echo '-')" >> "$LOG"
echo "OK $ZIP ($(du -h "$ZIP" | cut -f1))"
