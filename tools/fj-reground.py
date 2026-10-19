#!/usr/bin/env python3
"""Put photographed Fine Jewellery packshots on the common ground.

    python3 tools/fj-reground.py gd26-828 gd26-786 ...   # web image stems

The renders sit on a flat rgb(242). Pieces photographed on fabric, on a bust,
or on a white or tinted sweep looked out of place beside them, and
fj-import's lift_ground only evens out a plain backdrop: it cannot take out
folds, a bust or a shadowed cloth. This does, one image at a time:

  * the piece is found with macOS subject lifting (tools/subject-mask.swift).
    That mask is accurate in shape but soft and a few pixels wide of the
    metal, so it only bounds the piece;
  * the backdrop's own shading is estimated from everything outside it
    (normalised convolution, as in lift_ground), and inside it only the
    pixels that match that estimate go to the ground. Metal and stones stay
    exactly as shot, and a contact shadow fades out rather than being cut;
  * everything outside goes to a flat 242.

Each image is redone from the web image itself, not from the master in the
supplier drop: for several pieces the drop's master is a different variant of
the piece from the one on the site. The web image is already graded, so it is
not graded again. The .w640 copy is removed so build-responsive.sh makes it
afresh.

nginx lets browsers keep a photograph for 30 days without asking again, so
after a run give each redone file a new name (gd26-828.webp ->
gd26-828.g2.webp, and its .w640) and change the path in data.js, or
returning visitors keep the old backdrop.
Needs macOS 14+ with swiftc, Pillow, numpy and cwebp.
"""
import subprocess, sys, tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "frontend/fine-jewellery/img/products"
GROUND = 242  # as in fj-import.py


def blur(x, r):
    return np.asarray(Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float64)


def reground(a, mask):
    h, w, _ = a.shape
    near = np.asarray(Image.fromarray(np.where(mask > 127, 255, 0).astype(np.uint8)).filter(ImageFilter.MaxFilter(13))) > 127

    # the backdrop's shading, from the pixels clear of the piece, at quarter size
    s = 4
    sa = np.asarray(Image.fromarray(a.astype(np.uint8)).resize((w // s, h // s), Image.BILINEAR)).astype(np.float64)
    sm = np.asarray(Image.fromarray((~near * 255).astype(np.uint8)).resize((w // s, h // s), Image.BILINEAR)).astype(np.float64) / 255
    m_bl = blur(sm * 255, 10) / 255
    fill = np.median(a[~near], axis=0) if (~near).any() else np.full(3, GROUND)
    bg = np.empty_like(sa)
    for c in range(3):
        bg[..., c] = np.where(m_bl > 0.01, blur(sa[..., c] * sm, 10) / np.maximum(m_bl, 1e-3), fill[c])
    bg = np.asarray(Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)).astype(np.float64)

    keep = np.clip((np.abs(a - bg).max(axis=2) - 8) / 20, 0, 1)  # 0 within 8 levels of the backdrop, 1 beyond 28
    keep = np.minimum(keep, blur(near * 255.0, 3) / 255)
    keep = blur(keep * 255, 1.2)[..., None] / 255
    return np.clip(a * keep + GROUND * (1 - keep), 0, 255)


def main(stems):
    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        tool = t / "subject-mask"
        subprocess.run(["swiftc", "-O", str(ROOT / "tools/subject-mask.swift"), "-o", str(tool)], check=True)
        for stem in stems:
            dst = OUT / f"{stem}.webp"
            if not dst.exists():
                print(f"   {stem:16} no web image (skipped)")
                continue
            base, mask = t / "base.png", t / "mask.png"
            Image.open(dst).convert("RGB").save(base)
            subprocess.run([str(tool), str(base), str(mask)], check=True)
            a = np.asarray(Image.open(base).convert("RGB")).astype(np.float64)
            m = np.asarray(Image.open(mask).convert("L").resize(a.shape[1::-1], Image.BILINEAR))
            Image.fromarray((reground(a, m) + 0.5).astype(np.uint8)).save(base)
            subprocess.run(["cwebp", "-quiet", "-m", "6", "-sharp_yuv", "-q", "88", str(base), "-o", str(dst)], check=True)
            (OUT / f"{stem}.w640.webp").unlink(missing_ok=True)
            print(f"   {stem:16} -> {dst.name} {dst.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main(sys.argv[1:])
