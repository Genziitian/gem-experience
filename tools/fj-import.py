#!/usr/bin/env python3
"""Import a Fine Jewellery collection from the supplier drop.

    python3 tools/fj-import.py plan  Dazzle Entwine     # what would be built
    python3 tools/fj-import.py build Dazzle Entwine     # images + data.js

Reads each collection's spec sheet (the "<Collection> Collection*.xlsx" in the
drop folders) and its photographs, and for every piece that has both:

  * builds the web images from the masters, the way the live ones were made:
    Lanczos down to 1400 px (square packshots 1400x1400, model frames
    933x1400), the sparkle grade (tools/jewel-grade.sh; packshot knees above
    the grey ground so the glow never lifts it), then WebP q88, slowest
    search, sharp YUV. Nothing is upscaled.
  * puts every packshot on the common ground, rgb(242). Most masters are
    already there; for one that is not, only the backdrop is lifted (see
    lift_ground), so the stones keep the colour they were shot with. A
    near-white ground (>= 251) is left alone.
  * writes the product into frontend/fine-jewellery/data.js in the catalogue's
    own conventions (name, metal wording, story sentence, tone).

Pieces in the sheet without a photograph, and photographs without a sheet
row, are reported and skipped: nothing is guessed. Needs Pillow, numpy and
openpyxl (a venv is fine), ffmpeg and cwebp.
"""
import json, re, subprocess, sys, tempfile
from pathlib import Path

import numpy as np
import openpyxl
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
DROPS = ["Fine and Pret Jewellery 3", "Fine and Pret Jewellery 2", "Fine and Pret Jewellery"]  # newest first
OUT = ROOT / "frontend/fine-jewellery/img/products"
DATA = ROOT / "frontend/fine-jewellery/data.js"
GRADE = ROOT / "tools/jewel-grade.sh"
GROUND = 242

CODE = re.compile(r"^(G[A-Z]?\d{2}-\d+(?:\s?[A-Z])?)(?:_(\d+))?(?:\s*\(\d+\))?\.(jpe?g)$", re.I)

METAL = {
    "G-14kt-W": "White Gold", "G-14kt-R": "Rose Gold", "G-14kt-Y": "Yellow Gold",
    "G-14kt-WR": "White and Rose Gold", "G-18kt-W": "18k White Gold", "G-18kt-R": "18k Rose Gold",
    "G-18kt-WR": "18k White and Rose Gold", "G-18kt-Y": "18k Yellow Gold",
}
TYPE = {"ring": "Rings", "earring": "Earrings", "pendant": "Pendants", "necklace": "Necklaces",
        "bangle": "Bracelets", "bracelet": "Bracelets"}
NOUN = {"ring": "ring", "earring": "earrings", "pendant": "pendant", "necklace": "necklace",
        "bangle": "bangle", "bracelet": "bracelet"}
STONE = {  # sheet spelling -> catalogue name
    "t-savorite": "Tsavorite", "bi-tourmaline": "Bi-colour Tourmaline", "spessartite gemstone": "Spessartite",
    "tanzanite cabs": "Tanzanite", "fancy tanzanite": "Fancy Tanzanite",
}
TONE = {
    "Tanzanite": "#3a5f9a", "Fancy Tanzanite": "#6a5f9a", "Pink Spinel": "#c45a7a", "Aquamarine": "#7eb8c9",
    "Mint Garnet": "#6a9e7a", "Spessartite": "#d4783a", "Rose Rhodolite": "#9a3a6a", "Morganite": "#e8b4b8",
    "Tsavorite": "#2f8a4f", "Green Tourmaline": "#2a7a5a", "Bi-colour Tourmaline": "#7a6a8a",
    "Malaya Garnet": "#c47858", "Rubellite": "#b8325a",
}
SHAPE = {"pears": "pear-cut", "prs": "pear-cut", "rds": "round cut", "round": "round cut", "oval": "oval",
         "ovl": "oval", "octagon": "octagon-cut", "sq-octagon": "square octagon-cut", "sq-princess": "princess-cut",
         "sq-cushion": "cushion-cut", "marquise": "marquise-cut", "baguette": "baguette-cut", "kite": "kite-cut",
         "drops": "drop-cut", "triangle": "triangle-cut", "trillion cabs": "trillion cabochon"}


def norm(code):
    return re.sub(r"\s+", " ", code.strip().upper())


def slug(code):
    return re.sub(r"[^a-z0-9]+", "-", code.lower()).strip("-")


def stone_name(s):
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    return STONE.get(s.lower(), s.title() if s.islower() or s.isupper() else s)


# ------------------------------------------------------------------ sources

def sheet_for(col):
    for d in DROPS:
        base = ROOT / d / col
        if not base.is_dir():
            base = next((p for p in (ROOT / d).glob(col + "*") if p.is_dir()), None) if (ROOT / d).is_dir() else None
        if base:
            for x in sorted(base.glob("*.xlsx")):
                if re.search(r"collect|sheet|detail", x.name, re.I):
                    return x
    return None


def read_sheet(path):
    ws = openpyxl.load_workbook(path, data_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    out = []
    for r in rows[1:]:
        if not r or not any(r):
            continue
        cells = [c for c in r]
        code = next((c for c in cells if isinstance(c, str) and re.match(r"G[A-Z]?\d{2}-", c.strip(), re.I)), None)
        if not code:
            continue
        i = cells.index(code)
        metal, item = str(cells[i + 1] or "").strip(), str(cells[i + 2] or "").strip()
        if metal.lower() in TYPE:  # a row with the two columns swapped
            metal, item = item, metal
        stones_raw = str(cells[i + 3] or "")
        stones = []
        for part in stones_raw.split("\n"):
            m = re.match(r"\s*([^:]+?)\s*:-?\s*([\d.]+)\s*Cts", part, re.I)
            if m:
                stones.append((stone_name(m.group(1)), float(m.group(2))))
            elif part.strip():
                stones.append((stone_name(part), None))
        num = lambda v: float(v) if isinstance(v, (int, float)) else None
        out.append({
            "sku": norm(code), "metalCode": metal, "item": item.lower(), "stones": stones,
            "shape": str(cells[i + 4] or "").strip(), "pcs": num(cells[i + 5]), "stoneCt": num(cells[i + 6]),
            "diamondCt": num(cells[i + 7]), "netG": num(cells[i + 8]), "grossG": num(cells[i + 9]),
        })
    return out


def photos_for(col):
    """sku -> {index -> path}, newest drop and 'Updated' folders winning."""
    found = {}
    for d in DROPS:
        root = ROOT / d
        if not root.is_dir():
            continue
        for base in [p for p in root.iterdir() if p.is_dir() and p.name.strip().lower() == col.lower()]:
            files = sorted(base.rglob("*"), key=lambda p: (0 if "updated" in str(p.parent).lower() else 1, str(p)))
            for f in files:
                m = CODE.match(f.name)
                if not m or "png" in str(f.parent).lower():
                    continue
                sku, idx = norm(m.group(1)), int(m.group(2) or 0)
                model = "model" in str(f.parent).lower()
                key = (idx, model)
                found.setdefault(sku, {})
                if key not in found[sku]:
                    found[sku][key] = f
    return found


# ------------------------------------------------------------------- images

def ground(a):
    b = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    return np.median(b, axis=0)


def lift_ground(a):
    """Move a photographed backdrop onto the common ground, leaving the piece.

    A whole-image gamma (what 5060ede used) is fine when the ground is a few
    levels off, but a real photograph shot on a darker, vignetted grey needs
    an exponent near 0.3, which bleaches the stones. Instead: fit the
    backdrop's own shading (a quadratic surface through the pixels that look
    like backdrop: low saturation, near the border tone), and add the
    difference to 242 only where a pixel matches that surface. Stones,
    diamonds and metal differ from it and stay exactly as shot; shadows keep
    their depth because the lift is additive."""
    h, w, _ = a.shape
    g0 = ground(a)
    sat = a.max(axis=2) - a.min(axis=2)
    cand = (sat < 18) & (np.abs(a - g0).max(axis=2) < 40)
    ys, xs = np.nonzero(cand[::4, ::4])
    ys, xs = ys * 4, xs * 4
    yy, xx = ys / h - 0.5, xs / w - 0.5
    A = np.stack([np.ones_like(xx), xx, yy, xx * xx, yy * yy, xx * yy], 1)
    Y, X = np.mgrid[0:h, 0:w]
    Y, X = Y / h - 0.5, X / w - 0.5
    B = np.stack([np.ones_like(X), X, Y, X * X, Y * Y, X * Y], -1)
    bg = np.empty_like(a)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, a[ys, xs, c], rcond=None)
        bg[..., c] = B @ coef
    dist = np.abs(a - bg).max(axis=2)
    weight = np.clip(1 - (dist - 10) / 22, 0, 1)  # full lift within 10 levels, none beyond 32
    weight = np.asarray(Image.fromarray((weight * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))) / 255
    out = a + (GROUND - bg) * weight[..., None]
    return np.clip(out, 0, 255), g0


def build_image(src, dst):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    square = abs(w - h) <= 0.02 * max(w, h)
    if square:
        size = (min(1400, w), min(1400, h))
    else:
        size = (min(933, w), min(1400, h)) if h > w else (min(1400, w), min(933, h))
    with tempfile.TemporaryDirectory() as t:
        base, graded = Path(t) / "base.png", Path(t) / "graded.png"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf",
                        f"scale={size[0]}:{size[1]}:force_original_aspect_ratio=increase:flags=lanczos,crop={size[0]}:{size[1]}",
                        "-pix_fmt", "rgb24", str(base)], check=True)
        note = ""
        if square:
            a = np.asarray(Image.open(base).convert("RGB")).astype(np.float64)
            g = ground(a)
            if np.abs(g - GROUND).max() > 3 and g.max() < 251 and g.min() > 120:
                a, g = lift_ground(a)
                Image.fromarray((a + 0.5).astype(np.uint8)).save(base)
                note = f"ground {g.astype(int).tolist()} -> {GROUND} (backdrop only)"
            knees = ["0.975", "0.985"]
        else:
            knees = []
        subprocess.run(["zsh", str(GRADE), str(base), str(graded), *knees], check=True)
        subprocess.run(["cwebp", "-quiet", "-m", "6", "-sharp_yuv", "-q", "88", str(graded), "-o", str(dst)], check=True)
    return square, size, note


# --------------------------------------------------------------- catalogue

def describe(r, collection):
    stones = [s for s, _ in r["stones"]] or ["Gemstone"]
    noun = NOUN.get(r["item"], r["item"])
    # "Pink spinel, aquamarine and diamond dazzle bangle"
    parts = [s.lower() for s in stones] + ["diamond"]
    lead = ", ".join(parts[:-1]) + " and " + parts[-1]
    name = f"{lead[0].upper() + lead[1:]} {collection.lower()} {noun}"
    metal = METAL.get(r["metalCode"], r["metalCode"])
    shape = SHAPE.get(r["shape"].lower(), "")
    if len(r["stones"]) > 1 and all(c for _, c in r["stones"]):
        gem = " and ".join(f"{c:g} carats of {s.lower()}" for s, c in r["stones"])
    else:
        ct = f"{r['stoneCt']:g} carats of " if r["stoneCt"] else ""
        gem = f"{ct}{(shape + ' ') if shape else ''}{stones[0].lower()}"
    dia = f" paired with {r['diamondCt']:g} carats of brilliant cut diamonds" if r["diamondCt"] else ""
    story = f"Crafted in {metal}, set with {gem}{dia}."
    return name, metal, story, " & ".join(stones), TONE.get(stones[0], "#8a7f9a")


def plan(cols):
    out = []
    for col in cols:
        sheet = sheet_for(col)
        rows = read_sheet(sheet) if sheet else []
        photos = photos_for(col)
        nosku = sorted(set(photos) - {r["sku"] for r in rows})
        out.append((col, sheet, rows, photos, nosku))
    return out


def main():
    mode, cols = sys.argv[1], sys.argv[2:]
    data_src = DATA.read_text()
    data = json.loads(re.search(r"window\.FJ_DATA = (\{.*\});?\s*$", data_src, re.S).group(1))
    have = {p["sku"] for p in data["products"]}

    for col, sheet, rows, photos, nosku in plan(cols):
        print(f"\n== {col}: sheet {sheet.relative_to(ROOT) if sheet else 'NONE'}; {len(rows)} rows, {len(photos)} photographed codes")
        if nosku:
            print(f"   photographed but not in the sheet (skipped): {', '.join(nosku)}")
        for r in rows:
            shots = photos.get(r["sku"], {})
            if not shots:
                print(f"   {r['sku']:12} no photograph (skipped)")
                continue
            if r["sku"] in have:
                print(f"   {r['sku']:12} already in the catalogue (skipped)")
                continue
            name, metal, story, stone, tone = describe(r, col)
            order = sorted(shots, key=lambda k: (k[1], k[0]))  # packshots by index, then model frames
            names = []
            for i, key in enumerate(order):
                stem = slug(r["sku"]) + ("" if i == 0 else f"-{i}")
                names.append((shots[key], stem, key[1]))
            print(f"   {r['sku']:12} {name} · {metal} · {len(names)} images" +
                  (f" ({sum(m for *_, m in names)} model)" if any(m for *_, m in names) else ""))
            if mode != "build":
                continue
            imgs = []
            for src, stem, _ in names:
                dst = OUT / f"{stem}.webp"
                square, size, note = build_image(src, dst)
                imgs.append(f"img/products/{stem}.webp")
                print(f"      {src.relative_to(ROOT)} -> {dst.name} {size[0]}x{size[1]} {dst.stat().st_size // 1024}KB {note}")
            model = next((f"img/products/{stem}.webp" for _, stem, m in names if m), None)
            first = r["stones"][0][0] if r["stones"] else "Gemstone"
            prod = {
                "id": slug(r["sku"]), "sku": r["sku"], "name": name, "collection": col,
                "type": TYPE.get(r["item"], r["item"].title() + "s"), "metal": metal, "metalCode": r["metalCode"],
                "stone": stone, "shape": r["shape"].title() if r["shape"] else None,
                "stonePcs": int(r["pcs"]) if r["pcs"] else None, "stoneCt": r["stoneCt"], "diamondCt": r["diamondCt"],
                "netG": r["netG"], "grossG": r["grossG"], "story": story, "tone": tone, "images": imgs,
            }
            hover = model or (imgs[1] if len(imgs) > 1 else None)
            if hover:
                prod["hover"] = hover
            data["products"].append(prod)
            have.add(r["sku"])

    if mode == "build":
        head = data_src[: data_src.index("window.FJ_DATA")]
        DATA.write_text(head + "window.FJ_DATA = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n")
        print("\nwrote", DATA.relative_to(ROOT))


if __name__ == "__main__":
    main()
