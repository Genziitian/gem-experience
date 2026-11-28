#!/usr/bin/env python3
"""Which pieces have a 360° view, as a workbook: one sheet per category.

    python3 tools/spin-status.py "Gem Experience - 360 View Status.xlsx"

Reads the catalogue itself (fine-jewellery/data.js, high-jewellery/data.js,
the GE Icons page), so it is current whenever it is run. The Summary sheet's
counts are formulas over the category sheets. Needs openpyxl.
"""
import json, os, re, sys
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import CellIsRule
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "frontend"
ORIGIN = "https://gem-experience.com"
F = "Arial"
HEAD = PatternFill("solid", fgColor="17140F")
thin = Side(style="thin", color="E2DBD0")


def data(path, glob):
    s = (WEB / path).read_text()
    i = s.index("window." + glob)
    return json.loads(s[s.index("{", i): s.rindex("}") + 1])


def describe(p):
    """('Yes'/'No', how, note) from a piece's spin views."""
    views = (p.get("spin") or {}).get("views") or []
    if not views and not p.get("model"):
        return "No", "—", None
    full = [v.get("label") or "The piece" for v in views if v.get("side")]
    single = [v.get("label") or "The piece" for v in views if not v.get("side")]
    how = "Front + side photographs" if full else "Front photograph" if single else ""
    if p.get("model"):
        how = (how + " + 3D model") if how else "3D model"
    parts = []
    if full:
        parts.append(f"{', '.join(full)}: full turn from its front and side photographs")
    if single:
        parts.append(f"{', '.join(single)}: turns on its stand from the front photograph (no side photograph)")
    if p.get("model"):
        parts.append("the whole piece in 3D from the CAD file")
    return "Yes", how, "; ".join(parts)


wb = Workbook()
summary = wb.active
summary.title = "Summary"


def sheet(title, headers, rows, widths, flag):
    ws = wb.create_sheet(title)
    ws.append(headers)
    for c in ws[1]:
        c.font = Font(name=F, bold=True, color="FFFFFF", size=10)
        c.fill = HEAD
        c.alignment = Alignment(vertical="center", wrap_text=True)
    ws.row_dimensions[1].height = 28
    for r in rows:
        ws.append([v[0] if isinstance(v, tuple) else v for v in r])
        i = ws.max_row
        for j, v in enumerate(r, 1):
            c = ws.cell(i, j)
            c.font = Font(name=F, size=10)
            c.alignment = Alignment(vertical="top", wrap_text=j != len(r))
            c.border = Border(bottom=thin)
            if isinstance(v, tuple):
                c.hyperlink = v[1]
                c.font = Font(name=F, size=10, color="2A4F86", underline="single")
    for j, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(j)].width = w
    col = get_column_letter(flag)
    rng = f"{col}2:{col}{ws.max_row}"
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"Yes"'],
        fill=PatternFill("solid", fgColor="E6F2E8"), font=Font(name=F, bold=True, color="2F6B3A")))
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"No"'],
        fill=PatternFill("solid", fgColor="F7F3EE"), font=Font(name=F, color="8A8279")))
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{ws.max_row}"
    return col


NEED = "a 360° view needs a studio photograph of the piece (a front and a side view for a full turn)"
order = lambda yes, how: (0 if "side" in how else 1 if yes == "Yes" else 2)

# Fine Jewellery: the pieces live on the site
rows = []
for p in data("fine-jewellery/data.js", "FJ_DATA")["products"]:
    if p.get("hidden") or not p.get("images"):
        continue
    yes, how, note = describe(p)
    n = len(p["images"])
    note = note or f"{n} photograph{'s' if n != 1 else ''}; {NEED}"
    url = f"{ORIGIN}/fine-jewellery/p/{p['id']}/"
    rows.append([p["sku"], p["name"], p.get("collection") or "(no collection)", p.get("type") or "", n, yes, how, note, (url, url)])
rows.sort(key=lambda r: (order(r[5], r[6]), r[2], r[0]))
fj = sheet("Fine Jewellery", ["SKU", "Name", "Collection", "Type", "Photos", "360° view", "How", "Note", "Page"],
           rows, [13, 34, 16, 12, 8, 10, 26, 60, 52], 6)

# High Jewellery
rows = []
for p in data("high-jewellery/data.js", "HJ_DATA")["products"]:
    yes, how, note = describe(p)
    g, m = len(p.get("gallery") or []), len(p.get("models") or [])
    note = note or f"{g} product photograph{'s' if g != 1 else ''}; {NEED}"
    page = (WEB / "high-jewellery" / p["id"] / "index.html").exists()
    url = ORIGIN + (f"/high-jewellery/{p['id']}/" if page else "/high-jewellery/")
    ref = p.get("ref") if p.get("ref") and p.get("ref") != "—" else ""
    rows.append([ref, p["name"], p.get("collection") or "", p.get("type") or "", g, m, yes, how, note, (url, url)])
rows.sort(key=lambda r: (order(r[6], r[7]), r[1]))
hj = sheet("High Jewellery", ["Ref", "Name", "Collection", "Type", "Product photos", "Worn photos", "360° view", "How", "Note", "Page"],
           rows, [12, 22, 18, 12, 10, 10, 10, 28, 70, 48], 7)

# GE Icons
html = (WEB / "icons/index.html").read_text()
rows = []
for iid, a in re.findall(r'<article class="hp-gi" id="([^"]+)">([\s\S]*?)</article>', html):
    name = (re.search(r'hp-gi-title">([^<]+)', a) or [None, ""])[1]
    kind = (re.search(r'hp-gi-kind">([^<]+)', a) or [None, ""])[1]
    ref = (re.search(r"<dt>Ref[^<]*</dt>\s*<dd>([^<]+)", a) or [None, ""])[1]
    n = a.count("<img ")
    url = f"{ORIGIN}/icons/#{iid}"
    rows.append([ref, name, kind, n, "No", "—", f"{n} photograph{'s' if n != 1 else ''}, worn or styled; {NEED}", (url, url)])
gi = sheet("GE Icons", ["Ref", "Name", "Kind", "Photos", "360° view", "How", "Note", "Page"], rows, [13, 26, 26, 8, 10, 12, 60, 44], 5)

# Summary
s = summary
s["A1"] = "360° views by category"
s["A1"].font = Font(name=F, size=16, bold=True)
s["A2"] = "Gem Experience · gem-experience.com · built by tools/spin-status.py"
s["A2"].font = Font(name=F, size=10, color="6F675D")
s.append([])
s.append(["Category", "Pieces", "With 360°", "Full turn", "Turns on stand", "Without 360°", "Share with 360°"])
for c in s[4]:
    c.font = Font(name=F, bold=True, color="FFFFFF", size=10)
    c.fill = HEAD
for i, (name, col, howcol) in enumerate([("Fine Jewellery", fj, "G"), ("High Jewellery", hj, "H"), ("GE Icons", gi, "F")], 5):
    q = f"'{name}'"
    s.cell(i, 1, name)
    s.cell(i, 2, f"=COUNTA({q}!{col}2:{col}1000)")
    s.cell(i, 3, f'=COUNTIF({q}!{col}2:{col}1000,"Yes")')
    s.cell(i, 4, f'=COUNTIF({q}!{howcol}2:{howcol}1000,"Front + side*")')
    s.cell(i, 5, f"=C{i}-D{i}")
    s.cell(i, 6, f'=COUNTIF({q}!{col}2:{col}1000,"No")')
    s.cell(i, 7, f"=IF(B{i}=0,0,C{i}/B{i})")
s.cell(8, 1, "Total")
for j, L in zip(range(2, 7), "BCDEF"):
    s.cell(8, j, f"=SUM({L}5:{L}7)")
s.cell(8, 7, "=IF(B8=0,0,C8/B8)")
for r in range(5, 9):
    for j in range(1, 8):
        c = s.cell(r, j)
        c.font = Font(name=F, size=10, bold=(r == 8))
        c.border = Border(bottom=thin)
    s.cell(r, 7).number_format = "0.0%"
notes = [
    "How a piece turns",
    "• Full turn: between the piece's own front and side photographs (ring or bangle: through the band and edge-on; earring: face-on and in profile), mirrored for the far side.",
    "• Turns on stand: from its one front photograph; it narrows towards the side. A side photograph would make it a full turn.",
    "• 3D model: from the workshop's CAD file (Rift).",
    "• Fine Jewellery lists the pieces live on the site; pieces hidden or without photographs are left out.",
    "To add one: photograph the piece face-on and side-on on the studio ground (or 24–36 photographs on a turntable), or supply its CAD file.",
]
for k, t in enumerate(notes):
    c = s.cell(10 + k, 1, t)
    c.font = Font(name=F, size=10, bold=(k == 0), color="17140F" if k == 0 else "4A443C")
for j, w in enumerate([18, 10, 12, 12, 15, 14, 16], 1):
    s.column_dimensions[get_column_letter(j)].width = w

out = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "Gem Experience - 360 View Status.xlsx")
wb.save(out)
print("wrote", out)
