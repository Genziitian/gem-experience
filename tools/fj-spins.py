#!/usr/bin/env python3
"""Give Fine Jewellery pieces a 360° view from the photographs they already have.

    python3 tools/fj-spins.py plan     # what each piece would get, and why
    python3 tools/fj-spins.py build    # write "spin" into fine-jewellery/data.js

The house photographs a piece in a fixed order, and /js/spin-viewer.js turns a
piece from a front view (0°) and a side view (90°):

  rings, bangles   0 from above · 1 through the band (front) · 2 edge-on (side)
  earrings         0 the pair face-on · 1 the pair, the right one in profile
  pendants         0 face-on · 1 tilted (not a side view)

The order is not trusted blindly: a photograph must be on the studio ground
(not a model shot), the band view roughly round, the edge view narrow, the
earring in profile narrower than face-on. A piece that fails gets the
single-photograph turn from its front view instead; one with fewer than three
photographs, or none on the studio ground, gets nothing. Pieces that already
carry "spin" (set by hand) are left alone.

Needs Pillow. Reads the .w640 copies, so it is quick.
"""
import json, re, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "frontend/fine-jewellery/data.js"
IMG = ROOT / "frontend/fine-jewellery"


def small(src):
    p = IMG / src.replace(".webp", ".w640.webp")
    return p if p.exists() else IMG / src


def look(src, half=None):
    """(on studio ground?, bbox width, bbox height) of the piece in a photo."""
    im = Image.open(small(src)).convert("RGB")
    w, h = im.size
    px = im.load()
    corners = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    bg = tuple(sum(c[i] for c in corners) / 4 for i in range(3))
    studio = min(bg) > 205 and max(bg) - min(bg) < 22
    x0, x1 = (w // 2, w) if half == "right" else (0, w // 2) if half == "left" else (0, w)
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(0, h, 2):
        for x in range(x0, x1, 2):
            r, g, b = px[x, y]
            if max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2])) > 20:
                minx, maxx = min(minx, x), max(maxx, x)
                miny, maxy = min(miny, y), max(maxy, y)
    if maxx < 0:
        return studio, 0, 0
    return studio, maxx - minx + 1, maxy - miny + 1


def hole(src):
    """(on studio ground?, has a hole in the middle?, bbox height): a ring or
    bangle seen through its band is a loop round empty ground; seen edge-on,
    the band runs down the middle."""
    im = Image.open(small(src)).convert("RGB")
    w, h = im.size
    px = im.load()
    corners = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    bg = tuple(sum(c[i] for c in corners) / 4 for i in range(3))
    studio = min(bg) > 205 and max(bg) - min(bg) < 22
    on = lambda x, y: max(abs(a - b) for a, b in zip(px[x, y], bg)) > 20
    xs = [x for x in range(0, w, 3) for y in range(0, h, 6) if on(x, y)]
    ys = [y for y in range(0, h, 3) for x in range(0, w, 6) if on(x, y)]
    if not xs:
        return studio, False, 0
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    bw, bh = x1 - x0, y1 - y0
    cx, cy = x0 + bw // 2, y0 + int(bh * 0.58)
    r = max(3, int(min(bw, bh) * 0.08))
    pts = [(x, y) for x in range(cx - r, cx + r + 1, 2) for y in range(cy - r, cy + r + 1, 2)]
    empty = sum(1 for x, y in pts if 0 <= x < w and 0 <= y < h and not on(x, y)) / len(pts)
    return studio, empty > 0.9, bh


def plan(p):
    imgs = p.get("images") or []
    kind = (p.get("type") or "").lower()
    if len(imgs) < 3:
        return None, "fewer than 3 photographs"
    looks = [look(s) for s in imgs[:3]]
    if kind in ("rings", "bracelets"):
        # the band view (a loop) and the edge view (no loop, about as tall),
        # in whichever order they were shot
        hs = [hole(s) for s in imgs[1:3]]
        band = [i for i, (st, ho, bh) in enumerate(hs, 1) if st and ho]
        edge = [i for i, (st, ho, bh) in enumerate(hs, 1) if st and not ho]
        if len(band) == 1 and len(edge) == 1:
            hb, he = hs[band[0] - 1][2], hs[edge[0] - 1][2]
            if hb and 0.7 <= he / hb <= 1.35:
                return {"views": [{"front": imgs[band[0]], "side": imgs[edge[0]]}]}, f"full turn (band {band[0]}, edge {edge[0]})"
        if looks[0][0]:
            return {"views": [{"front": imgs[0]}]}, "front only (no band and edge pair)"
        return None, "no studio photograph"
    if kind == "earrings":
        s0, _, _ = looks[0]
        s1, _, _ = looks[1]
        if s0 and s1:
            _, wf, _ = look(imgs[0], "right")
            _, wp, _ = look(imgs[1], "right")
            if wf and wp < wf * 0.85:
                return {"views": [{"label": "Earring", "front": imgs[0], "frontCrop": "left",
                                   "side": imgs[1], "sideCrop": "right"}]}, "full turn (face-on, profile)"
        if s0:
            return {"views": [{"front": imgs[0]}]}, "front only (no profile view)"
        return None, "no studio photograph"
    if looks[0][0]:
        return {"views": [{"front": imgs[0]}]}, "front only (no side view)"
    return None, "no studio photograph"


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "plan"
    src = DATA.read_text()
    head = src[: src.index("window.FJ_DATA")]
    data = json.loads(re.search(r"window\.FJ_DATA = (\{.*\});?\s*$", src, re.S).group(1))
    tally = {}
    for p in data["products"]:
        if p.get("hidden") or p.get("spin") or not p.get("images"):
            continue
        spin, why = plan(p)
        key = ("full" if spin and any(v.get("side") for v in spin["views"]) else "front" if spin else "none")
        tally[key] = tally.get(key, 0) + 1
        if len(p["images"]) >= 3 or mode == "plan-all":
            print(f"  {p['id']:14} {p.get('type', ''):10} {len(p['images'])} photos  {key:5}  {why}")
        if mode == "build" and spin:
            p["spin"] = spin
    print("\n", tally)
    if mode == "build":
        DATA.write_text(head + "window.FJ_DATA = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n")
        print("wrote", DATA.relative_to(ROOT))


if __name__ == "__main__":
    main()
