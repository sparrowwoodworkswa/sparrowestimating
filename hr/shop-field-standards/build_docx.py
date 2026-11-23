#!/usr/bin/env python3
"""Build the Word file for the Sparrow Shop and Field Standards manual.

Usage (from repo root):
    python3 hr/shop-field-standards/build_docx.py

Needs pandoc and python-docx. Writes:
    hr/shop-field-standards/Sparrow-Shop-and-Field-Standards-DRAFT.docx

Styled to the Sparrow Woodworks design system
(https://claude.ai/artifact/MBY4JrHnvzZbNChLYzcDwP):
- Inter only. Light titles, SemiBold UPPERCASE section heads, Medium subheads,
  11 pt body. Weights are set by font name (Inter Light, Inter Medium,
  Inter SemiBold) so Word and Google Docs pick the right cut.
- Black, white and one gray. Ink #1A1A1A, muted #6B6B67, rules #DADAD6.
  No accent color, no italics, rules not boxes.
- Lockup A (bird + "Sparrow Woodworks") top-left on page 1 with the eyebrow
  top-right. Bird alone and page number on later pages. Footer with contact
  details in caption size.
- Margins 0.7 in.
"""
import re
import subprocess
import tempfile
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Emu, Pt, RGBColor, Inches

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SRC = HERE / "Sparrow-Shop-and-Field-Standards-DRAFT.md"
OUT = HERE / "Sparrow-Shop-and-Field-Standards-DRAFT.docx"
BIRD = ROOT / "public" / "brand" / "logo-bird.png"

DOC_NAME = "Shop and field standards"
DOC_DATE = "Draft · January 2027"
EYEBROW = "ADEPT BESPOKE GENERAL CONTRACTING"
# WA contractor registration number goes at the end once confirmed.
FOOTER = "PO Box 468, Indianola WA 98342 · sparrowwoodworks.com · 206.708.5615"

INK = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x6B, 0x6B, 0x67)
RULE = "DADAD6"
INK_HEX = "1A1A1A"

REGULAR = "Inter"
LIGHT = "Inter Light"
MEDIUM = "Inter Medium"
SEMIBOLD = "Inter SemiBold"

MARGIN = Inches(0.7)
TEXT_WIDTH = Emu(Inches(8.5) - 2 * MARGIN)


# ---------- low-level helpers ----------

def set_rfonts(rpr, font):
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.insert(0, rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(attr), font)
    for attr in ("w:asciiTheme", "w:hAnsiTheme", "w:cstheme", "w:eastAsiaTheme"):
        if rfonts.get(qn(attr)) is not None:
            del rfonts.attrib[qn(attr)]


def set_tracking(rpr, twentieths):
    sp = rpr.find(qn("w:spacing"))
    if sp is None:
        sp = OxmlElement("w:spacing")
        rpr.append(sp)
    sp.set(qn("w:val"), str(twentieths))


def track(size_pt, em):
    """Letter-spacing in twentieths of a point from an em value."""
    return round(size_pt * em * 20)


def style_font(style, font, size, color=INK, caps=False, tracking=None):
    f = style.font
    f.name = font
    set_rfonts(style.element.get_or_add_rPr(), font)
    f.size = Pt(size)
    f.bold = False
    f.italic = False
    f.color.rgb = color
    f.all_caps = caps
    if tracking is not None:
        set_tracking(style.element.get_or_add_rPr(), tracking)


def run_font(run, font, size=None, color=None, caps=None, tracking=None):
    run.font.name = font
    set_rfonts(run._r.get_or_add_rPr(), font)
    if size is not None:
        run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = color
    if caps is not None:
        run.font.all_caps = caps
    if tracking is not None:
        set_tracking(run._r.get_or_add_rPr(), tracking)


def border(ppr_owner, side, color=RULE, sz=4, space=6):
    ppr = ppr_owner.get_or_add_pPr()
    pbdr = ppr.find(qn("w:pBdr"))
    if pbdr is None:
        pbdr = OxmlElement("w:pBdr")
        ppr.append(pbdr)
    el = OxmlElement(f"w:{side}")
    el.set(qn("w:val"), "single")
    el.set(qn("w:sz"), str(sz))  # eighths of a point: 4 = 0.5 pt hairline
    el.set(qn("w:space"), str(space))
    el.set(qn("w:color"), color)
    pbdr.append(el)


def spacing(style, before, after, line=None):
    pf = style.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    if line:
        pf.line_spacing = line


def add_field(run, instr):
    for kind, text in (("begin", None), ("instr", instr), ("separate", None), ("end", None)):
        if kind == "instr":
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = text
        else:
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), kind)
        run._r.append(el)
        if kind == "separate":
            t = OxmlElement("w:t")
            t.text = "2"
            run._r.append(t)


def right_tab(paragraph):
    paragraph.paragraph_format.tab_stops.add_tab_stop(TEXT_WIDTH, WD_TAB_ALIGNMENT.RIGHT)


# ---------- reference.docx ----------

def make_reference(path: Path):
    subprocess.run(
        ["pandoc", "-o", str(path), "--print-default-data-file", "reference.docx"],
        check=True,
    )
    doc = Document(str(path))
    # python-docx's lookup wants lowercase built-in names; pandoc's file doesn't use them.
    styles = {s.name: s for s in doc.styles}

    for name in ("Normal", "Body Text", "First Paragraph", "Compact", "Block Text"):
        if name in styles:
            style_font(styles[name], REGULAR, 11)
            spacing(styles[name], 0, 6, 1.35)
    spacing(styles["Compact"], 0, 3, 1.3)

    # Title: doc-title, Light, sentence case. Subtitle: doc-subtitle in muted.
    style_font(styles["Title"], LIGHT, 30, tracking=track(30, -0.015))
    spacing(styles["Title"], 36, 4, 1.0)
    styles["Title"].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    style_font(styles["Subtitle"], REGULAR, 15, color=MUTED)
    spacing(styles["Subtitle"], 0, 24, 1.2)
    styles["Subtitle"].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    border(styles["Subtitle"].element, "bottom", RULE, 4, 12)

    # Section heads: SemiBold UPPERCASE, hairline rule above.
    h1 = styles["Heading 1"]
    style_font(h1, SEMIBOLD, 13, caps=True, tracking=track(13, 0.04))
    spacing(h1, 24, 12, 1.1)
    border(h1.element, "top", RULE, 4, 10)
    # Subheads: Medium, sentence case.
    style_font(styles["Heading 2"], MEDIUM, 14)
    spacing(styles["Heading 2"], 16, 6, 1.15)
    # Small labels: spec-label.
    style_font(styles["Heading 3"], SEMIBOLD, 11, caps=True, tracking=track(11, 0.04))
    spacing(styles["Heading 3"], 12, 4)
    for h in ("Heading 1", "Heading 2", "Heading 3"):
        styles[h].paragraph_format.keep_with_next = True

    # Tables: hairline between rows; firm ink rule under the head (set later).
    tbl = styles["Table"].element
    tblpr = tbl.find(qn("w:tblPr"))
    if tblpr is None:
        tblpr = OxmlElement("w:tblPr")
        tbl.append(tblpr)
    old = tblpr.find(qn("w:tblBorders"))
    if old is not None:
        tblpr.remove(old)
    borders = OxmlElement("w:tblBorders")
    for side in ("bottom", "insideH"):
        b = OxmlElement(f"w:{side}")
        b.set(qn("w:val"), "single")
        b.set(qn("w:sz"), "4")
        b.set(qn("w:color"), RULE)
        borders.append(b)
    tblpr.append(borders)

    if "Hyperlink" in styles:
        styles["Hyperlink"].font.color.rgb = INK
    doc.save(str(path))


# ---------- markdown prep ----------

def prepare_markdown(md: str) -> str:
    lines = md.splitlines()
    title = lines[0].lstrip("# ").strip()
    rest = lines[1:]
    while rest and not rest[0].strip():
        rest.pop(0)
    subtitle = rest.pop(0).strip()
    body = "\n".join(rest)
    # Word's heading structure replaces the Contents list.
    body = re.sub(r"\n## Contents\n.*?(?=\n## )", "\n", body, flags=re.S)
    return f'---\ntitle: "{title}"\nsubtitle: "{subtitle}"\n---\n\n{body}\n'


# ---------- header and footer ----------

def build_header_footer(doc):
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Inches(8.5), Inches(11)
    sec.left_margin = sec.right_margin = MARGIN
    sec.top_margin = sec.bottom_margin = MARGIN
    sec.header_distance = sec.footer_distance = Inches(0.4)
    sec.different_first_page_header_footer = True

    # Page 1: lockup A left, eyebrow right.
    p = sec.first_page_header.paragraphs[0]
    right_tab(p)
    name_size = 14  # wordmark size; bird = 1.6x, gap = 0.55x
    r = p.add_run()
    r.add_picture(str(BIRD), height=Pt(name_size * 1.6))
    gap = p.add_run(" ")
    run_font(gap, REGULAR, name_size * 0.55)
    r = p.add_run("Sparrow Woodworks")
    run_font(r, REGULAR, name_size, INK, tracking=track(name_size, -0.01))
    r = p.add_run("\t" + EYEBROW)
    run_font(r, SEMIBOLD, 9, INK, caps=True, tracking=track(9, 0.08))

    # Page 2+: bird alone left, page number right, hairline under.
    p = sec.header.paragraphs[0]
    right_tab(p)
    p.add_run().add_picture(str(BIRD), height=Pt(16))
    r = p.add_run("\t")
    r = p.add_run()
    run_font(r, REGULAR, 9, MUTED)
    add_field(r, "PAGE")
    border(p._p, "bottom", RULE, 4, 6)

    # Footer on every page: contact details left, document name and date right.
    for footer in (sec.first_page_footer, sec.footer):
        p = footer.paragraphs[0]
        right_tab(p)
        r = p.add_run(FOOTER + "\t" + f"{DOC_NAME} · {DOC_DATE}")
        run_font(r, REGULAR, 8, MUTED)


# ---------- post-processing ----------

def en_dash_bullets(doc):
    numbering = doc.part.numbering_part.element
    for lvl in numbering.iter(qn("w:lvl")):
        fmt = lvl.find(qn("w:numFmt"))
        if fmt is not None and fmt.get(qn("w:val")) == "bullet":
            lvl.find(qn("w:lvlText")).set(qn("w:val"), "–")
            rpr = lvl.find(qn("w:rPr"))
            if rpr is None:
                rpr = OxmlElement("w:rPr")
                lvl.append(rpr)
            set_rfonts(rpr, REGULAR)


def semibold_for_bold(doc):
    """Bold runs (labels like NOTE: and [CONFIRM]) become Inter SemiBold."""
    for r in doc.element.body.iter(qn("w:r")):
        rpr = r.find(qn("w:rPr"))
        if rpr is None:
            continue
        b = rpr.find(qn("w:b"))
        if b is not None and b.get(qn("w:val")) not in ("0", "false"):
            rpr.remove(b)
            set_rfonts(rpr, SEMIBOLD)
        i = rpr.find(qn("w:i"))
        if i is not None:
            rpr.remove(i)


def style_tables(doc):
    for table in doc.tables:
        head = table.rows[0]
        for cell in head.cells:
            tcpr = cell._tc.get_or_add_tcPr()
            borders = OxmlElement("w:tcBorders")
            b = OxmlElement("w:bottom")
            b.set(qn("w:val"), "single")
            b.set(qn("w:sz"), "6")
            b.set(qn("w:color"), INK_HEX)
            borders.append(b)
            tcpr.append(borders)
            for p in cell.paragraphs:
                for r in p.runs:
                    run_font(r, SEMIBOLD, 9, INK, caps=True, tracking=track(9, 0.08))
        # Column widths: narrow first column when it holds numbers.
        first = [row.cells[0].text.strip() for row in table.rows[1:]]
        if first and all(re.fullmatch(r"[\d.]+", t) for t in first):
            widths = [0.12, 0.6, 0.28]
        else:
            widths = [0.35, 0.65] if len(table.columns) == 2 else None
        if widths and len(widths) == len(table.columns):
            grid = table._tbl.tblGrid
            for gc, w in zip(grid.iter(qn("w:gridCol")), widths):
                gc.set(qn("w:w"), str(int(TEXT_WIDTH.twips * w)))
            for row in table.rows:
                for cell, w in zip(row.cells, widths):
                    cell.width = Emu(int(TEXT_WIDTH * w))


def checklists(doc):
    for p in doc.paragraphs:
        if p.text.lstrip().startswith(("☐", "☒")):
            ppr = p._p.pPr
            if ppr is not None and ppr.numPr is not None:
                ppr.remove(ppr.numPr)
            p.paragraph_format.left_indent = Inches(0.2)


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
    doc = Document(str(OUT))
    build_header_footer(doc)
    en_dash_bullets(doc)
    semibold_for_bold(doc)
    style_tables(doc)
    checklists(doc)
    doc.save(str(OUT))
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
