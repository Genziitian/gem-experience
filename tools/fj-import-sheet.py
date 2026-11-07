#!/usr/bin/env python3
"""Import Fine Jewellery pieces from the house's product list.

    python3 tools/fj-import-sheet.py plan     # what would be built
    python3 tools/fj-import-sheet.py build    # images + data.js

For the list the house keeps as one sheet ("Fine Jewellery for website.xlsx",
Sheet1: SKU, title, type, collection, stone/diamond/gold/gross weight, metal)
with the photographs in "Fine jewellery For website - 1.1/<Type>/<SKU>/".
fj-import.py reads the older drops, one spec sheet per collection; this reads
the newer list and builds the pieces the same way, with that tool's image
pipeline (common ground, sparkle grade, WebP) and its naming conventions.

The sheet gives no stone shape or piece count, so the story names only what
it does give. A collection the site does not have ("N/A", or one with no page
yet) is left empty rather than guessed: the card shows the piece's category.
Pieces already in the catalogue are skipped; their copy stays as it is.

DESIGNS joins pieces made to one design in different stones into one card,
the first id leading (data.js "design"), as checked by eye against the
photographs. Needs Pillow, numpy and openpyxl (a venv is fine), ffmpeg and
cwebp.
"""
import importlib.util, json, re, sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "Fine Jewellery for website.xlsx"
PHOTOS = ROOT / "Fine jewellery For website - 1.1"

spec = importlib.util.spec_from_file_location("fj_import", ROOT / "tools/fj-import.py")
fj = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fj)

COLLECTIONS = {"Bloom", "Safar", "Dazzle", "Entwine", "Dome", "Tide", "Swirl", "Spectrum", "Flare",
               "Royal Starling", "Multi Colour"}
COLLECTION_ALIAS = {"multi colour": "Multi Colour"}
KIND = {"ring": "ring", "earring": "earrings", "pendant": "pendant", "necklace": "necklace",
        "bangle": "bangle", "bracelet": "bracelet"}
STONE = {"t-savorite": "Tsavorite", "multi gemstones": "Multi Gemstone", "pink spinel cut": "Pink Spinel",
         "tanzanite cut": "Tanzanite"}
TONE = dict(fj.TONE, **{"Green Beryl": "#5f9a6a", "Pink Tourmaline": "#d07a9a", "Rhodolite": "#9a3a5a",
                        "Lavender Tanzanite": "#8a7fc0", "Tourmaline": "#7a8a6a", "Diamond": "#b9bec4"})

# same design, different stones: the lead id first (an existing card where
# there is one, so the grid keeps its place)
DESIGNS = [
    ["gd26-187", "gd26-288"], ["gd25-1022", "gd26-973", "gd26-974"], ["gd24-346", "gd26-975", "gd26-991"],
    ["gd26-791", "gd26-497"], ["gd25-1096", "gd26-774"], ["gd26-918", "gd26-279"],
    ["gd26-828", "gd26-804", "gd26-805"], ["gd26-783", "gd26-983", "gd26-984"],
    ["gd26-811", "gd26-837", "gd26-997", "gd26-552"], ["gd26-780", "gd26-996", "gd26-775"],
    ["gd26-742", "gd26-743", "gd26-744"], ["gd26-850", "gd26-851"], ["gd26-770", "gd26-771"],
    ["gd26-855", "gd26-856"], ["gd26-852", "gd26-888"], ["gd26-755", "gd26-758"], ["gd26-776", "gd26-777"],
    ["gd26-745", "gd26-798"], ["gd26-812", "gd26-814"], ["gd26-508", "gd26-781"], ["gd26-957", "gd26-960"],
    ["gd26-753", "gd26-756"], ["gd26-955", "gd26-958"], ["gd26-956", "gd26-959"], ["gd26-754", "gd26-757"],
]


def stones_of(title):
    """'Spessartite & Pink Spinel Ring' -> ['Spessartite', 'Pink Spinel'];
    diamonds are reported separately, so they drop out unless they are all
    there is ('Diamond & Diamond Ring')."""
    words = re.sub(r"\s+(ring|earring|pendant|necklace|bangle|bracelet)s?\s*$", "", title.strip(), flags=re.I)
    parts = [p.strip() for p in words.split("&") if p.strip()]
    out = []
    for p in parts:
        name = STONE.get(p.lower(), p)
        if name.lower() != "diamond" and name not in out:
            out.append(name)
    return out or ["Diamond"]


def metal_of(m):
    """'18kt White & Rose Gold' -> ('18k White and Rose Gold', 'G-18kt-WR')."""
    m = re.sub(r"\s+", " ", str(m)).strip()
    k = re.match(r"(\d+)\s*kt", m, re.I).group(1)
    colours = re.findall(r"white|yellow|rose", m, re.I)
    words = " and ".join(c.title() for c in colours)
    return f"{k}k {words} Gold", f"G-{k}kt-" + "".join(c[0].upper() for c in colours)


def collection_of(c):
    c = re.sub(r"\s+", " ", str(c or "")).strip()
    c = COLLECTION_ALIAS.get(c.lower(), c)
    return c if c in COLLECTIONS else None


def describe(r):
    stones, kind = r["stones"], KIND[r["item"]]
    lead = " and ".join(stones) if len(stones) < 3 else ", ".join(stones[:-1]) + " and " + stones[-1]
    name = f"{lead} {kind.title()}"
    low = [s.lower() for s in stones]
    with_dia = r["diamondCt"] and r["stones"] != ["Diamond"]
    sub_parts = low + (["diamonds"] if with_dia else [])
    subtitle = (", ".join(sub_parts[:-1]) + " and " + sub_parts[-1]) if len(sub_parts) > 1 else sub_parts[0]
    subtitle = subtitle[0].upper() + subtitle[1:]
    spec_parts = low + (["diamond"] if with_dia else [])
    spec_lead = (", ".join(spec_parts[:-1]) + " and " + spec_parts[-1]) if len(spec_parts) > 1 else spec_parts[0]
    word = (r["collection"] or "").lower()
    spec_name = f"{spec_lead[0].upper() + spec_lead[1:]} {word + ' ' if word and word != 'multi colour' else ''}{kind}"
    gem = f"{r['stoneCt']:g} carats of " + (" and ".join(low) if len(low) < 3 else ", ".join(low[:-1]) + " and " + low[-1])
    dia = f" paired with {r['diamondCt']:g} carats of brilliant cut diamonds" if with_dia else ""
    story = f"Crafted in {r['metal']}, set with {gem}{dia}."
    return name, subtitle, spec_name, story


def read_rows():
    ws = openpyxl.load_workbook(SHEET, data_only=True)["Sheet1"]
    out = []
    for c in ws.iter_rows(min_row=2, values_only=True):
        if not c[2] or not str(c[2]).strip().upper().startswith("G"):
            continue
        num = lambda v: float(v) if isinstance(v, (int, float)) else None
        metal, code = metal_of(c[10])
        out.append({
            "sku": fj.norm(str(c[2])), "dir": str(c[2]).strip(), "title": str(c[3]).strip(), "item": str(c[4]).strip().lower(),
            "folder": str(c[4]).strip(), "collection": collection_of(c[5]), "sheetCollection": str(c[5]).strip(),
            "stones": stones_of(str(c[3])), "stoneCt": num(c[6]), "diamondCt": num(c[7]), "netG": num(c[8]),
            "grossG": num(c[9]), "metal": metal, "metalCode": code,
        })
    return out


def photos_of(r):
    """{(index, model): path}: SKU.jpg first, then SKU_1, SKU_2..."""
    found = {}
    for f in sorted((PHOTOS / r["folder"] / r["dir"]).glob("*")):
        m = fj.CODE.match(f.name)
        if not m:
            continue
        found[(int(m.group(2) or 0), False)] = f
    return found


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "plan"
    data_src = fj.DATA.read_text()
    data = json.loads(re.search(r"window\.FJ_DATA = (\{.*\});?\s*$", data_src, re.S).group(1))
    have = {p["sku"] for p in data["products"]}
    for r in read_rows():
        shots = photos_of(r)
        if r["sku"] in have:
            print(f"   {r['sku']:12} already in the catalogue (skipped)")
            continue
        if not shots:
            print(f"   {r['sku']:12} no photograph (skipped)")
            continue
        name, subtitle, spec_name, story = describe(r)
        names = fj.shot_names(shots, fj.slug(r["sku"]))
        col = r["collection"] or f"(none; sheet: {r['sheetCollection']})"
        print(f"   {r['sku']:12} {name} · {r['metal']} · {col} · {len(names)} images")
        if mode != "build":
            continue
        imgs, _ = fj.build_all(names)
        prod = {
            "id": fj.slug(r["sku"]), "sku": r["sku"], "name": name, "collection": r["collection"],
            "type": fj.TYPE[r["item"]], "metal": r["metal"], "metalCode": r["metalCode"],
            "stone": " & ".join(r["stones"]), "shape": None, "stonePcs": None,
            "stoneCt": r["stoneCt"], "diamondCt": r["diamondCt"] or None, "netG": r["netG"], "grossG": r["grossG"],
            "story": story, "tone": TONE.get(r["stones"][0], "#8a7f9a"), "images": imgs,
            "subtitle": subtitle, "specName": spec_name,
        }
        if len(imgs) > 1:
            prod["hover"] = imgs[1]
        data["products"].append(prod)
        have.add(r["sku"])

    by = {p["id"]: p for p in data["products"]}
    for group in DESIGNS:
        lead = group[0]
        for pid in group:
            if pid in by:
                by[pid]["design"] = lead
            elif mode == "build":
                print(f"   design {lead}: {pid} not in the catalogue")

    if mode == "build":
        head = data_src[: data_src.index("window.FJ_DATA")]
        fj.DATA.write_text(head + "window.FJ_DATA = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n")
        print("\nwrote", fj.DATA.relative_to(ROOT))


if __name__ == "__main__":
    main()
