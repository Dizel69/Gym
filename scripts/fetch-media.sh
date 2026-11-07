#!/bin/sh
# Download the exercise stills (webp) and loops (mp4) into media/.
# You normally don't need this — `docker compose up` fetches them once.
# The pictures are © Gym visual, licensed for use in openGym, and are not
# covered by the AGPL. They are not committed. See NOTICE.md.
set -eu
img="${1:-}"
gif="${2:-}"
if [ -z "$img" ]; then
  root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
  img="$root/media/img"
  gif="$root/media/gif"
fi
mkdir -p "$img" "$gif"
if [ -f "$img/5965.webp" ]; then
  echo "✓ Exercise media already present — skipping download."
  exit 0
fi
cat <<'EOF'
↓ Downloading exercise pictures (~200 MB, one time)
  Source: github.com/DuarteSantos8/openGym tag v1.4.4, catalogue/media
  Stills and loops: © Gym visual — https://gymvisual.com/
  Licensed for openGym, not part of the AGPL. This app downloads them and
  does not put them in the repository. Details in NOTICE.md.
EOF
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git clone --depth 1 --filter=blob:none --sparse --branch v1.4.4 \
  https://github.com/DuarteSantos8/openGym.git "$tmp/og"
git -C "$tmp/og" sparse-checkout set catalogue/media/still catalogue/media/clip
cp "$tmp/og"/catalogue/media/still/*.webp "$img/"
cp "$tmp/og"/catalogue/media/clip/*.mp4 "$gif/"
echo "✓ $(find "$img" -name '*.webp' | wc -l) stills, $(find "$gif" -name '*.mp4' | wc -l) clips"
