#!/usr/bin/env python3
"""High Jewellery card images that show the whole set.

    python3 tools/hj-set-cards.py            # every piece in SETS
    python3 tools/hj-set-cards.py rihla      # just these

A card used to show one photograph, so some pieces were known by their
necklace and others only by their earrings. For a piece made as a set, this
draws the card from two of its own stills: the necklace large on the left and
its earrings beside it, on the house grey. Each still is first put on the
common ground the way tools/fj-reground.py does it (macOS subject mask, then
only backdrop-like pixels lifted), so the two sit on one even field.

Writes high-jewellery/img/<id>-set.webp (1200px square, like the other card
images) and sets "card" on the piece in data.js; app.js prefers that over
img/<id>.webp. Needs macOS 14+ with swiftc, Pillow, numpy and cwebp.
"""
import importlib.util, json, re, subprocess, sys, tempfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
HJ = ROOT / "frontend/high-jewellery"
DATA = HJ / "data.js"
spec = importlib.util.spec_from_file_location("fj_reground", ROOT / "tools/fj-reground.py")
rg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rg)
GROUND = rg.GROUND
SIZE = 1200

# piece -> (necklace still, earrings still), both from img/pieces/<id>/
SETS = {
    "celestine": ("p8", "p1"), "ember": ("p4", "p1"), "hive": ("p4", "p3"),
    "jardin-bleu": ("p1", "p3"), "mahenge": ("p4", "p1"), "merelani": ("p3", "p1"),
    "oldoinyo": ("p3", "p1"), "rift": ("p1", "p2"), "rihla": ("p1", "p3"),
    "shamsa": ("p4", "p1"), "the-crown": ("p3", "p1"), "usambara": ("p4", "p3"),
    "weaver": ("p3", "p1"),
}


def on_ground(src, tool, t):
    """The still on a flat GROUND, cropped to the piece with a margin."""
    base, mask = t / "base.png", t / "mask.png"
    Image.open(src).convert("RGB").save(base)
    a = np.asarray(Image.open(base).convert("RGB")).astype(np.float64)
    if subprocess.run([str(tool), str(base), str(mask)]).returncode == 0:
        m = np.asarray(Image.open(mask).convert("L").resize(a.shape[1::-1], Image.BILINEAR))
    else:
        # no subject found (a fine, open necklace): whatever stands off the ground
        m = np.where(np.abs(a - rg.blur(a, 40)).max(axis=2) > 10, 255, 0).astype(np.uint8)
    a = rg.reground(a, m)
    ys, xs = np.where(np.abs(a - GROUND).max(axis=2) > 6)
    pad = int(0.03 * max(a.shape))
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0),
           min(xs.max() + pad, a.shape[1]), min(ys.max() + pad, a.shape[0]))
    return Image.fromarray((a + 0.5).astype(np.uint8)).crop(box)


def fit(im, w, h):
    s = min(w / im.width, h / im.height)
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)


def compose(necklace, earrings):
    canvas = Image.new("RGB", (SIZE, SIZE), (GROUND,) * 3)
    margin = round(SIZE * 0.06)
    split = round(SIZE * 0.64)  # the necklace leads; the earrings take the rest
    n = fit(necklace, split - margin * 1.5, SIZE - 2 * margin)
    e = fit(earrings, SIZE - split - margin, (SIZE - 2 * margin) * 0.62)
    canvas.paste(n, (margin + (split - margin - n.width) // 2, (SIZE - n.height) // 2))
    canvas.paste(e, (split + (SIZE - split - margin - e.width) // 2, (SIZE - e.height) // 2))
    return canvas


def main(ids):
    src = DATA.read_text()
    head = src[: src.index("window.HJ_DATA")]
    data = json.loads(re.search(r"window\.HJ_DATA = (\{.*\});?\s*$", src, re.S).group(1))
    by = {p["id"]: p for p in data["products"]}
    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        tool = t / "subject-mask"
        subprocess.run(["swiftc", "-O", str(ROOT / "tools/subject-mask.swift"), "-o", str(tool)], check=True)
        for pid in ids or SETS:
            if pid not in by or pid not in SETS:
                print(f"   {pid:12} not a set piece in data.js (skipped)")
                continue
            neck, ear = (HJ / f"img/pieces/{pid}/{s}.webp" for s in SETS[pid])
            card = compose(on_ground(neck, tool, t), on_ground(ear, tool, t))
            png, dst = t / "card.png", HJ / f"img/{pid}-set.webp"
            card.save(png)
            subprocess.run(["cwebp", "-quiet", "-m", "6", "-sharp_yuv", "-q", "86", str(png), "-o", str(dst)], check=True)
            (HJ / f"img/{pid}-set.w640.webp").unlink(missing_ok=True)
            by[pid]["card"] = f"img/{pid}-set.webp"
            print(f"   {pid:12} {SETS[pid][0]} + {SETS[pid][1]} -> {dst.name} {dst.stat().st_size // 1024}KB")
    DATA.write_text(head + "window.HJ_DATA = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n")


if __name__ == "__main__":
    main(sys.argv[1:])
