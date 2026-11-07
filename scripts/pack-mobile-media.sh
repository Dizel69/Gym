#!/bin/sh
# Copy exercise stills and clips into frontend/dist so the Android app
# can show them with no network. The files are downloaded, not committed.
# Run this after `vite build` and before `cap sync`.
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
dist="$root/frontend/dist"
if [ ! -f "$dist/index.html" ]; then
  echo "frontend/dist is missing. Build the mobile bundle first." >&2
  exit 1
fi
sh "$root/scripts/fetch-media.sh" "$root/media/img" "$root/media/gif"
rm -rf "$dist/img" "$dist/gif"
mkdir -p "$dist/img" "$dist/gif"
cp "$root/media/img/"*.webp "$dist/img/"
cp "$root/media/gif/"*.mp4 "$dist/gif/"
echo "✓ Packed $(find "$dist/img" -name '*.webp' | wc -l) stills and $(find "$dist/gif" -name '*.mp4' | wc -l) clips into the phone bundle"
