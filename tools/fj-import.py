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

# GD26-253, GD26-253 A, and the older "G 624" style; then _1, _2... and an optional " (1)" copy mark
CODE = re.compile(r"^(G[A-Z]?\d{2}-\d+(?:\s?[A-Z])?|G \d{3,4})(?:_(\d+))?(?:\s*\(\d+\))?\.(jpe?g)$", re.I)
SHEET_CODE = re.compile(r"G[A-Z]?\d{2}-|G \d{3,4}\b", re.I)

METAL = {
    "G-14kt-W": "White Gold", "G-14kt-R": "Rose Gold", "G-14kt-Y": "Yellow Gold",
    "G-14kt-WR": "White and Rose Gold", "G-18kt-W": "18k White Gold", "G-18kt-R": "18k Rose Gold",
    "G-18kt-WR": "18k White and Rose Gold", "G-18kt-Y": "18k Yellow Gold",
    "G-18kt-YW": "18k Yellow and White Gold", "G-14kt-YW": "Yellow and White Gold",
    "G-14kt-RW": "White and Rose Gold", "G-18kt-RW": "18k White and Rose Gold",
}
TYPE = {"ring": "Rings", "earring": "Earrings", "pendant": "Pendants", "necklace": "Necklaces",
        "bangle": "Bracelets", "bracelet": "Bracelets"}
NOUN = {"ring": "ring", "earring": "earrings", "pendant": "pendant", "necklace": "necklace",
        "bangle": "bangle", "bracelet": "bracelet"}
STONE = {  # sheet spelling -> catalogue name
    "t-savorite": "Tsavorite", "bi-tourmaline": "Bi-colour Tourmaline", "spessartite gemstone": "Spessartite",
    "tanzanite cabs": "Tanzanite", "fancy tanzanite": "Fancy Tanzanite",
    "pink spinel cabs": "Pink Spinel", "spessarite": "Spessartite", "spessartite cabs": "Spessartite",
    "rhodolite": "Rhodolite", "tourmaline": "Tourmaline",
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
    """The spec sheet with the most product rows across the drops: names vary
    ("Tide Collecetion.xlsx", "DOME.xlsx") and some folders also hold an empty
    "Untitled spreadsheet"."""
    best, best_n = None, 0
    for d in DROPS:
        root = ROOT / d
        if not root.is_dir():
            continue
        for base in [p for p in root.iterdir() if p.is_dir() and " ".join(p.name.split()).lower() == " ".join(col.split()).lower()]:
            for x in sorted(base.rglob("*.xlsx")):
                if x.name.startswith("~$"):
                    continue
                try:
                    n = len(read_sheet(x))
                except Exception:
                    continue
                if n > best_n:
                    best, best_n = x, n
    return best


def display(col):
    return " ".join(col.split())


# the word a collection lends its pieces' names ("Aquamarine and diamond
# spectrum ring"); some read better without it
NAME_WORD = {"Multi Colour": "", "Shamsa Fine": "shamsa"}


def read_sheet(path):
    ws = openpyxl.load_workbook(path, data_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    out = []
    for r in rows[1:]:
        if not r or not any(r):
            continue
        cells = [c for c in r]
        code = next((c for c in cells if isinstance(c, str) and SHEET_CODE.match(c.strip())), None)
        if not code:
            continue
        i = cells.index(code)
        metal, item = str(cells[i + 1] or "").strip(), str(cells[i + 2] or "").strip()
        if metal.lower() in TYPE:  # a row with the two columns swapped
            metal, item = item, metal
        item = re.sub(r"^(high jewellery|hj)[\s-]*", "", item.strip(), flags=re.I)
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
        for base in [p for p in root.iterdir() if p.is_dir() and " ".join(p.name.split()).lower() == " ".join(col.split()).lower()]:
            files = sorted(base.rglob("*"), key=lambda p: (0 if "updated" in str(p.parent).lower() else 1, str(p)))
            for f in files:
                m = CODE.match(f.name)
                if not m or "png" in str(f.parent).lower():
                    continue
                sku, idx = norm(m.group(1)), int(m.group(2) or 0)
                # a model frame is the portrait one; folder names mix both
                # ("Updated product- model image")
                with Image.open(f) as im:
                    w, h = im.size
                model = abs(w - h) > 0.02 * max(w, h)
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
    an exponent near 0.3, which bleaches the stones. Instead: estimate the
    backdrop's own shading by normalised convolution (blur only the pixels
    that look like backdrop, divide by the blurred mask), which follows any
    light fall-off, round or linear, and add the difference to 242 only where
    a pixel matches that estimate. Stones, diamonds and metal differ from it
    and stay exactly as shot; shadows keep their depth because the lift is
    additive."""
    g0 = ground(a)
    sat = a.max(axis=2) - a.min(axis=2)
    cand = ((sat < 18) & (np.abs(a - g0).max(axis=2) < 45)).astype(np.float64)

    def blur(x, r):
        im = Image.fromarray(np.clip(x * 255 if x.max() <= 1.0 else x, 0, 255).astype(np.uint8))
        return np.asarray(im.filter(ImageFilter.GaussianBlur(r))).astype(np.float64)

    small = 4  # estimate at quarter size: the shading is smooth, and it is fast
    h, w, _ = a.shape
    sa = np.asarray(Image.fromarray(a.astype(np.uint8)).resize((w // small, h // small), Image.BILINEAR)).astype(np.float64)
    sm = np.asarray(Image.fromarray((cand * 255).astype(np.uint8)).resize((w // small, h // small), Image.BILINEAR)).astype(np.float64) / 255
    r = 12
    m_bl = np.asarray(Image.fromarray((sm * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float64) / 255
    bg_small = np.empty_like(sa)
    for c in range(3):
        num = np.asarray(Image.fromarray(np.clip(sa[..., c] * sm, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float64)
        bg_small[..., c] = np.where(m_bl > 0.02, num / np.maximum(m_bl, 1e-3), g0[c])
    bg = np.asarray(Image.fromarray(np.clip(bg_small, 0, 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)).astype(np.float64)

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

def metal_name(code):
    """G-18kt-W -> 18k White Gold; tolerant of case and of a missing colour."""
    c = str(code or "").strip()
    hit = next((v for k, v in METAL.items() if k.lower() == c.lower()), None)
    if hit:
        return hit
    m = re.match(r"G-(\d+)kt$", c, re.I)
    return f"{m.group(1)}k Gold" if m else c


def describe(r, collection):
    stones = [s for s, _ in r["stones"]] or ["Gemstone"]
    noun = NOUN.get(r["item"], r["item"])
    # "Pink spinel, aquamarine and diamond dazzle bangle"
    parts = [s.lower() for s in stones] + ["diamond"]
    lead = ", ".join(parts[:-1]) + " and " + parts[-1]
    word = NAME_WORD.get(collection, collection.lower())
    name = f"{lead[0].upper() + lead[1:]} {word + ' ' if word else ''}{noun}"
    metal = metal_name(r["metalCode"])
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


def shot_names(shots, stem0):
    """Packshots in their own order, then model frames; stems stem0, stem0-1..."""
    order = sorted(shots, key=lambda k: (k[1], k[0]))
    return [(shots[k], stem0 + ("" if i == 0 else f"-{i}"), k[1]) for i, k in enumerate(order)]


def build_all(names):
    imgs = []
    for src, stem, _ in names:
        dst = OUT / f"{stem}.webp"
        square, size, note = build_image(src, dst)
        imgs.append(f"img/products/{stem}.webp")
        print(f"      {src.relative_to(ROOT)} -> {dst.name} {size[0]}x{size[1]} {dst.stat().st_size // 1024}KB {note}")
    model = next((f"img/products/{stem}.webp" for _, stem, m in names if m), None)
    return imgs, model


def main():
    mode, cols = sys.argv[1], sys.argv[2:]
    data_src = DATA.read_text()
    data = json.loads(re.search(r"window\.FJ_DATA = (\{.*\});?\s*$", data_src, re.S).group(1))
    have = {p["sku"] for p in data["products"]}

    for col, sheet, rows, photos, nosku in plan([display(c) for c in cols]):
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
            names = shot_names(shots, slug(r["sku"]))
            print(f"   {r['sku']:12} {name} · {metal} · {len(names)} images" +
                  (f" ({sum(m for *_, m in names)} model)" if any(m for *_, m in names) else ""))
            if mode != "build":
                continue
            imgs, model = build_all(names)
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

        # Pieces already in the catalogue that have been waiting for a
        # photograph (Swirl, part of Bloom) get one; their copy stays.
        for prod in data["products"]:
            if prod.get("collection") != col or prod.get("images"):
                continue
            shots = photos.get(norm(prod["sku"]), {})
            if not shots:
                continue
            names = shot_names(shots, prod["id"])
            print(f"   {prod['sku']:12} existing piece, adding {len(names)} images")
            if mode != "build":
                continue
            imgs, model = build_all(names)
            prod["images"] = imgs
            hover = model or (imgs[1] if len(imgs) > 1 else None)
            if hover:
                prod["hover"] = hover

    if mode == "build":
        head = data_src[: data_src.index("window.FJ_DATA")]
        DATA.write_text(head + "window.FJ_DATA = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n")
        print("\nwrote", DATA.relative_to(ROOT))


if __name__ == "__main__":
    main()
