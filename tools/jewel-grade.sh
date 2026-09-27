#!/bin/zsh
# jewel-grade.sh IN OUT — the "sparkle" grade for jewellery photographs.
#
# Sharpens and adds depth only where the picture is bright (diamonds, metal,
# stone highlights) through a luminance mask, so skin and backgrounds stay
# exactly as shot; then blooms the brightest glints — a tight halo (sigma 2.2)
# for the pinpoint sparkle and a wide one (sigma 11) for the glow around it.
# Works in RGB throughout so a neutral studio grey stays neutral (within 2
# levels), which the home hero relies on to meet the page background.
#
# Grade from the master at the final size, then encode, e.g.:
#   ffmpeg -i master.jpg -vf scale=1440:-2:flags=lanczos -pix_fmt rgb24 base.png
#   tools/jewel-grade.sh base.png graded.png
#   cwebp -m 6 -sharp_yuv -q 88 graded.png -o out.webp
set -e
ffmpeg -v error -y -i "$1" -filter_complex "[0]format=gbrp,split=3[o][a][m];[a]unsharp=5:5:0.9:5:5:0.9,unsharp=11:11:0.35:11:11:0.35[sh];[m]format=gray,curves=all='0/0 0.60/0 0.80/1 1/1',gblur=sigma=1.2,format=gbrp[mk];[o][sh][mk]maskedmerge,split=3[b][p][q];[p]curves=all='0/0 0.93/0 1/1',gblur=sigma=2.2[s];[q]curves=all='0/0 0.95/0 1/1',gblur=sigma=11[w];[b][s]blend=all_mode=screen:all_opacity=0.85[b2];[b2][w]blend=all_mode=screen:all_opacity=0.4,format=rgb24" "$2"
