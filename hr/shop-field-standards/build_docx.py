#!/usr/bin/env python3
"""Build the branded Word file for the Sparrow Shop and Field Standards manual.

Usage (from repo root):
    python3 hr/shop-field-standards/build_docx.py

Needs pandoc and python-docx. Writes:
    hr/shop-field-standards/Sparrow-Shop-and-Field-Standards-DRAFT.docx

Brand: ink #1A1A18, wood accent #8A6A3B on numbered section headings,
hairline rules #D8D8D2, uppercase tracked small labels, Arial.
"""
import re
import subprocess
import tempfile
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor, Inches

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SRC = HERE / "Sparrow-Shop-and-Field-Standards-DRAFT.md"
OUT = HERE / "Sparrow-Shop-and-Field-Standards-DRAFT.docx"
LOGO = ROOT / "public" / "brand" / "logo-full.png"

INK = RGBColor(0x1A, 0x1A, 0x18)
WOOD = RGBColor(0x8A, 0x6A, 0x3B)
MUTED = RGBColor(0x6B, 0x6B, 0x66)
HAIRLINE = "D8D8D2"
FONT = "Arial"


def set_font(style, size=None, bold=None, color=INK, caps=None, spacing=None):
    f = style.font
    f.name = FONT
    rpr = style.element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(attr), FONT)
    for attr in ("w:asciiTheme", "w:hAnsiTheme", "w:cstheme", "w:eastAsiaTheme"):
        if rfonts.get(qn(attr)) is not None:
            del rfonts.attrib[qn(attr)]
    if size:
        f.size = Pt(size)
    if bold is not None:
        f.bold = bold
    if color is not None:
        f.color.rgb = color
    if caps is not None:
        f.all_caps = caps
    if spacing is not None:  # character spacing in twentieths of a point
        sp = rpr.find(qn("w:spacing"))
        if sp is None:
            sp = OxmlElement("w:spacing")
            rpr.append(sp)
        sp.set(qn("w:val"), str(spacing))


def para_border(style, side="bottom", sz=4, space=4):
    ppr = style.element.get_or_add_pPr()
    pbdr = ppr.find(qn("w:pBdr"))
    if pbdr is None:
        pbdr = OxmlElement("w:pBdr")
        ppr.append(pbdr)
    el = OxmlElement(f"w:{side}")
    el.set(qn("w:val"), "single")
    el.set(qn("w:sz"), str(sz))  # eighths of a point: 4 = 0.5pt hairline
    el.set(qn("w:space"), str(space))
    el.set(qn("w:color"), HAIRLINE)
    pbdr.append(el)


def spacing(style, before, after, line=None):
    pf = style.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    if line:
        pf.line_spacing = line


def make_reference(path: Path):
    subprocess.run(
        ["pandoc", "-o", str(path), "--print-default-data-file", "reference.docx"],
        check=True,
    )
    doc = Document(str(path))
    # Look styles up by display name. python-docx's own lookup expects
    # lowercase built-in names ("heading 1"), which pandoc's file doesn't use.
    styles = {s.name: s for s in doc.styles}

    for name in ("Normal", "Body Text", "First Paragraph", "Compact"):
        if name in styles:
            set_font(styles[name], size=10.5)
            spacing(styles[name], 0, 6, 1.25)
    if "Compact" in styles:
        spacing(styles["Compact"], 0, 3, 1.2)

    # Document title
    set_font(styles["Title"], size=26, bold=True)
    spacing(styles["Title"], 6, 4)
    styles["Title"].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    para_border(styles["Title"], "bottom", 4, 8)
    if "Subtitle" in styles:
        set_font(styles["Subtitle"], size=9, bold=False, color=MUTED, caps=True, spacing=40)

    # Numbered section headings: wood accent, hairline rule above
    h1 = styles["Heading 1"]
    set_font(h1, size=16, bold=True, color=WOOD)
    spacing(h1, 22, 8)
    para_border(h1, "top", 4, 10)
    # Subsections: ink
    set_font(styles["Heading 2"], size=12, bold=True, color=INK)
    spacing(styles["Heading 2"], 14, 4)
    # Small labels: uppercase, tracked
    set_font(styles["Heading 3"], size=8.5, bold=True, color=INK, caps=True, spacing=40)
    spacing(styles["Heading 3"], 12, 4)
    for h in ("Heading 1", "Heading 2", "Heading 3"):
        styles[h].element.get_or_add_pPr()
        styles[h].font.italic = False

    # Tables: hairline borders
    if "Table" in styles:
        tbl = styles["Table"].element
        tblpr = tbl.find(qn("w:tblPr"))
        if tblpr is None:
            tblpr = OxmlElement("w:tblPr")
            tbl.append(tblpr)
        borders = OxmlElement("w:tblBorders")
        for side in ("top", "bottom", "insideH"):
            b = OxmlElement(f"w:{side}")
            b.set(qn("w:val"), "single")
            b.set(qn("w:sz"), "4")
            b.set(qn("w:color"), HAIRLINE)
            borders.append(b)
        tblpr.append(borders)

    for name in ("Hyperlink",):
        if name in styles:
            styles[name].font.color.rgb = WOOD
    doc.save(str(path))


def prepare_markdown(md: str) -> str:
    lines = md.splitlines()
    title = lines[0].lstrip("# ").strip()
    body = "\n".join(lines[1:])
    # The Contents list is replaced by Word's own heading structure.
    body = re.sub(r"\n## Contents\n.*?(?=\n## )", "\n", body, flags=re.S)
    front = (
        f"---\ntitle: \"{title}\"\nsubtitle: \"Sparrow Woodworks · How we build\"\n---\n\n"
        f"![]({LOGO}){{width=2.2in}}\n\n"
    )
    return front + body


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        ref = tmp / "reference.docx"
        make_reference(ref)
        md = tmp / "manual.md"
        md.write_text(prepare_markdown(SRC.read_text()))
        subprocess.run(
            [
                "pandoc", str(md),
                "-f", "markdown+task_lists+pipe_tables",
                "--shift-heading-level-by=-1",
                "--reference-doc", str(ref),
                "-o", str(OUT),
            ],
            check=True,
        )
    # Logo before the title; nudge it to the top of the page.
    doc = Document(str(OUT))
    body = doc.element.body
    paras = doc.paragraphs
    logo = next(p for p in paras if p._p.xpath(".//pic:pic"))
    body.remove(logo._p)
    body.insert(0, logo._p)
    logo.paragraph_format.space_after = Pt(18)

    # Checklist items: keep the checkbox, drop the bullet in front of it.
    for p in doc.paragraphs:
        if p.text.lstrip().startswith(("\u2610", "\u2612")):
            ppr = p._p.pPr
            if ppr is not None and ppr.numPr is not None:
                ppr.remove(ppr.numPr)
            p.paragraph_format.left_indent = Inches(0.25)

    # Table header rows: uppercase tracked small labels.
    for table in doc.tables:
        for cell in table.rows[0].cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.all_caps = True
                    r.font.bold = True
                    r.font.size = Pt(8)
                    sp = OxmlElement("w:spacing")
                    sp.set(qn("w:val"), "40")
                    r._r.get_or_add_rPr().append(sp)
    for sec in doc.sections:
        sec.left_margin = sec.right_margin = Inches(1)
        sec.top_margin = sec.bottom_margin = Inches(0.9)
    doc.save(str(OUT))
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
