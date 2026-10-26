#!/usr/bin/env bash
# Smaller copies of the catalogue photographs for phones.
#
#   tools/build-responsive.sh
#
# For every product photograph, High Jewellery card image and model frame
# (the High Jewellery landing shows those large), writes
# <name>.w640.webp beside it (the collection banners get <name>.w900.webp).
# The storefront offers both through srcset, so a phone downloads the small
# copy and a wide screen the original. An original already 640px or narrower
# is copied rather than enlarged. Existing copies are kept; delete one to
# have it rebuilt. Needs cwebp. `npm run build:seo` runs this first.
set -euo pipefail
cd "$(dirname "$0")/../frontend"

width() { python3 -c "
import struct,sys
b=open(sys.argv[1],'rb').read(40)
if b[12:16]==b'VP8 ': print(struct.unpack('<H',b[26:28])[0]&0x3fff)
elif b[12:16]==b'VP8L': print((int.from_bytes(b[21:25],'little')&0x3fff)+1)
else: print(int.from_bytes(b[24:27],'little')+1)" "$1"; }

make() { # src target-width suffix
  local src=$1 w=$2 out="${1%.webp}.$3.webp"
  [ -f "$out" ] && return 0
  if [ "$(width "$src")" -le "$w" ]; then cp "$src" "$out"
  else cwebp -quiet -q 80 -m 6 -resize "$w" 0 "$src" -o "$out"; fi
  echo "  $out"
}

n=0
for f in fine-jewellery/img/products/*.webp high-jewellery/img/*.webp high-jewellery/img/pieces/*/m*.webp high-jewellery/img/pieces/usambara/p2.webp; do
  case "$f" in *.w640.webp|*.w900.webp) continue ;; esac
  make "$f" 640 w640; n=$((n + 1))
done
for f in fine-jewellery/img/*-banner.webp; do
  case "$f" in *.w900.webp) continue ;; esac
  make "$f" 900 w900
done
echo "responsive: $n photographs checked"
