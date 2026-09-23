#!/usr/bin/env python3
"""
Generate the ModernDataSciEng Platform project PDF.

Uses ReportLab + registered Noto fonts. Output goes to
/home/z/my-project/download/ModernDataSciEng-Platform.pdf
"""
import os, sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, ListFlowable, ListItem, Image, Flowable, HRFlowable,
)
from reportlab.platypus.frames import Frame
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.pdfgen import canvas

# ============================================================
# Font registration (per skill rule — register CJK + Latin fonts)
# ============================================================
FONT_DIR = "/usr/share/fonts/truetype"
FONTS_REGISTERED = False

def register_fonts():
    global FONTS_REGISTERED
    if FONTS_REGISTERED:
        return
    try:
        # Body: Liberation Serif (Regular + Bold + Italic + BoldItalic available)
        pdfmetrics.registerFont(TTFont("LibSerif",      f"{FONT_DIR}/liberation/LiberationSerif-Regular.ttf"))
        pdfmetrics.registerFont(TTFont("LibSerif-Bold", f"{FONT_DIR}/liberation/LiberationSerif-Bold.ttf"))
        pdfmetrics.registerFont(TTFont("LibSerif-Italic", f"{FONT_DIR}/liberation/LiberationSerif-Italic.ttf"))
        pdfmetrics.registerFont(TTFont("LibSerif-BoldItalic", f"{FONT_DIR}/liberation/LiberationSerif-BoldItalic.ttf"))
        pdfmetrics.registerFontFamily("LibSerif",
            normal="LibSerif", bold="LibSerif-Bold",
            italic="LibSerif-Italic", boldItalic="LibSerif-BoldItalic")

        # Heading: DejaVu Sans (Regular + Bold)
        pdfmetrics.registerFont(TTFont("DejaSans",      f"{FONT_DIR}/dejavu/DejaVuSans.ttf"))
        pdfmetrics.registerFont(TTFont("DejaSans-Bold",  f"{FONT_DIR}/dejavu/DejaVuSans-Bold.ttf"))
        pdfmetrics.registerFontFamily("DejaSans",
            normal="DejaSans", bold="DejaSans-Bold",
            italic="DejaSans", boldItalic="DejaSans-Bold")

        # Mono: DejaVu Sans Mono
        pdfmetrics.registerFont(TTFont("DejaMono",      f"{FONT_DIR}/dejavu/DejaVuSansMono.ttf"))
        pdfmetrics.registerFont(TTFont("DejaMono-Bold", f"{FONT_DIR}/dejavu/DejaVuSansMono-Bold.ttf"))
        pdfmetrics.registerFontFamily("DejaMono",
            normal="DejaMono", bold="DejaMono-Bold",
            italic="DejaMono", boldItalic="DejaMono-Bold")

        FONTS_REGISTERED = True
    except Exception as e:
        print(f"Font registration warning: {e}", file=sys.stderr)
        FONTS_REGISTERED = True  # don't retry

register_fonts()

# ============================================================
# Palette (matches the app's emerald + slate + amber)
# ============================================================
PRIMARY = colors.HexColor("#0f7c5a")     # deep emerald
ACCENT  = colors.HexColor("#d97706")     # amber
SLATE   = colors.HexColor("#1f2937")     # dark slate
MUTED   = colors.HexColor("#6b7280")     # muted gray
LIGHT_BG = colors.HexColor("#f8fafc")    # near-white
BORDER  = colors.HexColor("#e5e7eb")

BODY_FONT = "LibSerif"
BODY_BOLD = "LibSerif-Bold"
HEAD_FONT = "DejaSans-Bold"
HEAD_FONT_REG = "DejaSans"
MONO_FONT = "DejaMono"

# ============================================================
# Styles
# ============================================================
ss = getSampleStyleSheet()

styles = {
    "cover_title": ParagraphStyle("CoverTitle", fontName=HEAD_FONT, fontSize=32, leading=38, textColor=SLATE, alignment=TA_LEFT, spaceAfter=8),
    "cover_sub":   ParagraphStyle("CoverSub",   fontName=HEAD_FONT_REG, fontSize=14, leading=20, textColor=PRIMARY, alignment=TA_LEFT, spaceAfter=4),
    "cover_meta":  ParagraphStyle("CoverMeta",  fontName=BODY_FONT, fontSize=10, leading=14, textColor=MUTED, alignment=TA_LEFT),
    "h1":          ParagraphStyle("H1", fontName=HEAD_FONT, fontSize=20, leading=26, textColor=SLATE, spaceBefore=14, spaceAfter=6),
    "h2":          ParagraphStyle("H2", fontName=HEAD_FONT, fontSize=14, leading=20, textColor=PRIMARY, spaceBefore=12, spaceAfter=4),
    "body":        ParagraphStyle("Body", fontName=BODY_FONT, fontSize=10, leading=14, textColor=SLATE, alignment=TA_JUSTIFY, spaceAfter=6),
    "body_left":   ParagraphStyle("BodyLeft", fontName=BODY_FONT, fontSize=10, leading=14, textColor=SLATE, alignment=TA_LEFT, spaceAfter=6),
    "bullet":      ParagraphStyle("Bullet", fontName=BODY_FONT, fontSize=10, leading=14, textColor=SLATE, alignment=TA_LEFT, spaceAfter=2, leftIndent=12),
    "small":       ParagraphStyle("Small", fontName=BODY_FONT, fontSize=8, leading=11, textColor=MUTED, alignment=TA_LEFT),
    "small_mono":  ParagraphStyle("SmallMono", fontName=MONO_FONT, fontSize=8, leading=11, textColor=MUTED, alignment=TA_LEFT),
    "table_head":  ParagraphStyle("TableHead", fontName=HEAD_FONT, fontSize=9, leading=12, textColor=colors.white, alignment=TA_LEFT),
    "table_cell":  ParagraphStyle("TableCell", fontName=BODY_FONT, fontSize=9, leading=12, textColor=SLATE, alignment=TA_LEFT),
    "table_mono":  ParagraphStyle("TableMono", fontName=MONO_FONT, fontSize=8, leading=11, textColor=SLATE, alignment=TA_LEFT),
    "quote":       ParagraphStyle("Quote", fontName=BODY_FONT, fontSize=10, leading=14, textColor=PRIMARY, alignment=TA_LEFT, leftIndent=14, spaceBefore=6, spaceAfter=6),
}

# ============================================================
# Page templates (cover + body with footer)
# ============================================================
PAGE_W, PAGE_H = A4
LEFT_MARGIN = RIGHT_MARGIN = 18 * mm
TOP_MARGIN = 20 * mm
BOTTOM_MARGIN = 22 * mm
USABLE_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

class PageNumCanvas(canvas.Canvas):
    """Add footer with page number + GDPR note on body pages."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pages = []

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        page_count = len(self.pages)
        for i, state in enumerate(self.pages):
            self.__dict__.update(state)
            self._draw_footer(i + 1, page_count)
            super().showPage()
        super().save()

    def _draw_footer(self, page_num, total):
        if page_num == 1:
            # Cover page — no footer (cover is its own design)
            return
        # Footer line
        self.setStrokeColor(BORDER)
        self.setLineWidth(0.5)
        self.line(LEFT_MARGIN, BOTTOM_MARGIN - 6, PAGE_W - RIGHT_MARGIN, BOTTOM_MARGIN - 6)
        # Left: copyright + GDPR
        self.setFont(BODY_FONT, 7.5)
        self.setFillColor(MUTED)
        self.drawString(LEFT_MARGIN, BOTTOM_MARGIN - 14,
            "© ModernDataSciEng Ltd · Synthetic reference platform · GDPR Reg. 2016/679")
        # Right: page number
        self.drawRightString(PAGE_W - RIGHT_MARGIN, BOTTOM_MARGIN - 14, f"Page {page_num} of {total}")
        # Bottom line — contact
        self.drawString(LEFT_MARGIN, BOTTOM_MARGIN - 22, "Contact: testdemoqwenai2025-creator@users.noreply.github.com  ·  github.com/testdemoqwenai2025-creator")
        self.drawRightString(PAGE_W - RIGHT_MARGIN, BOTTOM_MARGIN - 22, "ModernDataSciEng-Platform.pdf")

def cover_page(canvas_obj, doc):
    """Cover page background + decoration. Called by PageTemplate."""
    c = canvas_obj
    # Background: light
    c.setFillColor(LIGHT_BG)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Left accent bar
    c.setFillColor(PRIMARY)
    c.rect(0, 0, 8 * mm, PAGE_H, fill=1, stroke=0)
    # Top accent strip
    c.setFillColor(ACCENT)
    c.rect(8 * mm, PAGE_H - 6 * mm, PAGE_W - 8 * mm, 6 * mm, fill=1, stroke=0)
    # Subtle grid in bottom-right
    c.setStrokeColor(colors.HexColor("#e5e7eb"))
    c.setLineWidth(0.4)
    for i in range(0, 40, 4):
        c.line(PAGE_W - 60 * mm + i, 20 * mm, PAGE_W - 60 * mm + i, 60 * mm)
    for j in range(20, 64, 4):
        c.line(PAGE_W - 60 * mm, j * mm, PAGE_W - 20 * mm, j * mm)
    # Cover content rendered via flowables (see story)

def body_page(canvas_obj, doc):
    """Body page background — minimal."""
    c = canvas_obj
    c.setFillColor(colors.white)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

# ============================================================
# Build story
# ============================================================
story = []

# ---------- COVER ----------
story.append(Spacer(1, 80 * mm))
story.append(Paragraph("ModernDataSciEng", styles["cover_title"]))
story.append(Paragraph("Platform", styles["cover_title"]))
story.append(Spacer(1, 8 * mm))
story.append(Paragraph("A scalable, governed data platform — trusted, single-source-of-truth datasets across the business", styles["cover_sub"]))
story.append(Spacer(1, 6 * mm))
story.append(Paragraph("Reference architecture · 14 pages · Knowledge Loop", styles["cover_sub"]))
story.append(Spacer(1, 60 * mm))
# Cover meta block
cover_meta_data = [
    ["Document",        "ModernDataSciEng Platform — Project Report"],
    ["Version",         "v2.4 (FY26)"],
    ["Synthetic data",  "All numbers, schemas, pipelines and dashboards are hypothetical"],
    ["Compliance",      "GDPR Reg. 2016/679 — PII tagged + masked via Unity Catalogue"],
    ["Public repo",     "github.com/testdemoqwenai2025-creator/DemoAppDataSci"],
    ["Private repo",    "github.com/testdemoqwenai2025-creator/AppDataSci-Advanced"],
    ["Contact",         "testdemoqwenai2025-creator@users.noreply.github.com"],
]
cover_meta_table = Table(cover_meta_data, colWidths=[40 * mm, USABLE_W - 40 * mm])
cover_meta_table.setStyle(TableStyle([
    ("FONT", (0, 0), (0, -1), HEAD_FONT_REG, 9),
    ("FONT", (1, 0), (1, -1), BODY_FONT, 9),
    ("TEXTCOLOR", (0, 0), (0, -1), PRIMARY),
    ("TEXTCOLOR", (1, 0), (1, -1), SLATE),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LINEBELOW", (0, 0), (-1, -2), 0.3, BORDER),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(cover_meta_table)
story.append(PageBreak())

# ---------- 1. EXECUTIVE SUMMARY ----------
story.append(Paragraph("1. Executive Summary", styles["h1"]))
story.append(Paragraph(
    "The ModernDataSciEng Platform is a synthetic reference implementation of a modern, governed data platform "
    "for a hypothetical omnichannel retailer (ModernDataSciEng Ltd). Every number, schema, pipeline and dashboard "
    "in this document is hypothetical and illustrative — the platform exists to show how a small, capable data "
    "engineering team partners with stakeholders, analysts and platform teams to onboard new sources, improve "
    "quality and ship governed analytics at scale. The platform spans Snowflake, Databricks, dbt, Tableau, "
    "Fivetran, Hightouch, Airflow and Unity Catalogue — every layer is purpose-built, observable and CI/CD-driven.",
    styles["body"]))
story.append(Paragraph(
    "This document is the canonical project report. It summarises the architecture, technology stack, the fourteen "
    "pages of the application, the Knowledge Loop that distinguishes this platform from static reference "
    "architectures, the GDPR compliance posture, and the author's thoughts on ever-evolving technologies that "
    "should be considered for the next 24-36 months. It is the entry point for new engineers, auditors and "
    "interested external parties who want to understand the platform in one sitting.",
    styles["body"]))

story.append(Paragraph("Headline outcomes (synthetic)", styles["h2"]))
exec_kpi_data = [
    ["Metric", "Value", "Trend"],
    ["Pipeline freshness (P95)", "9 min", "−37% vs FY24"],
    ["Data trust score", "98.4 / 100", "+4.2 pts"],
    ["Active governed datasets", "268", "+54 YoY"],
    ["Self-service analysts", "312", "+118 YoY"],
    ["Annual platform cost", "£2.8M", "−19% / TB"],
    ["Data incidents (P0/P1)", "3", "−71% vs FY24"],
]
exec_kpi_table = Table(exec_kpi_data, colWidths=[USABLE_W * 0.40, USABLE_W * 0.25, USABLE_W * 0.35])
exec_kpi_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONT", (0, 0), (-1, 0), HEAD_FONT, 9),
    ("FONT", (0, 1), (-1, -1), BODY_FONT, 9),
    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(exec_kpi_table)

# ---------- 2. ARCHITECTURE ----------
story.append(Paragraph("2. Reference Architecture", styles["h1"]))
story.append(Paragraph(
    "The platform is built as four logical planes — sources, lakehouse, serving warehouse and consumption — wired "
    "together with orchestration, governance and CI/CD. The canonical data flow is unidirectional: source systems "
    "are ingested via Fivetran into the Bronze layer (append-only Delta on ADLS Gen2 / S3); PySpark + Delta MERGE "
    "conform the data into Silver (deduplicated, validated, joined to SCD2 dimensions); dbt + PySpark DLT build "
    "the Gold dimensional marts; Snowflake serves them as SECURE VIEWS with row-level security; Tableau + Hightouch "
    "consume and activate the data.",
    styles["body"]))
story.append(Paragraph(
    "Each layer has a single, hard-enforced responsibility. Bronze is append-only and schema-on-read; Silver is "
    "conformed via idempotent MERGE on business keys; Gold is dimensional and BI-facing. This separation makes the "
    "platform debuggable (every problem has a layer), rerunnable (no layer corrupts upstream), and cost-optimised "
    "(each layer can be tuned independently — Z-ORDER on Silver, cluster keys on Gold, lifecycle rules on Bronze).",
    styles["body"]))

story.append(Paragraph("Layer-by-layer responsibilities", styles["h2"]))
layer_data = [
    ["Layer", "Technology", "Role"],
    ["Sources",      "Shopify, Salesforce, Stripe, NetSuite, Klaviyo, Snowplow, Adobe, Meta, Google Ads, SAP Ariba, Workday, POS, Amazon SP-API, Zendesk", "Systems of record across commerce, marketing, finance, HR & operations"],
    ["Ingestion",    "Fivetran (ELT) + Snowplow (event pipeline) + Kafka (streaming)", "Schema-on-read CDC into Bronze, no transformations here"],
    ["Lakehouse",    "Azure ADLS Gen2 / S3 + Delta Lake", "Single open storage format, ACID + time travel + Z-ORDER"],
    ["Compute",      "Databricks (Spark, PySpark, Photon, SQL warehouses)", "Bronze→Silver→Gold transforms + ML feature engineering"],
    ["Warehouse",    "Snowflake (multi-cluster warehouses)", "BI-grade SQL serving, RLS, secure sharing, reverse-ETL API"],
    ["Transformation", "dbt Core + dbt Cloud + MetricFlow semantic layer", "Staging → Intermediate → Marts → Serving, tests & docs"],
    ["Orchestration", "Airflow (batch) + Dagster (asset-based)", "Idempotent DAGs, SLAs, retries, circuit-breakers"],
    ["Analytics",     "Tableau Server + Tableau Catalog + embedded APIs", "Governed dashboards, RLS, certified datasets, alerting"],
    ["Reverse-ETL",   "Hightouch", "Push governed audiences back into CRM / CDP / ad platforms"],
    ["Governance",    "Unity Catalogue + Monte Carlo + OpenLineage + Immuta", "PII tagging, lineage, DQ, RBAC, audit & masking"],
    ["IaC / CI/CD",   "Terraform + GitHub Actions + dbt slim CI", "Reproducible environments, state-aware model promotion"],
]
layer_table = Table(layer_data, colWidths=[USABLE_W * 0.18, USABLE_W * 0.42, USABLE_W * 0.40])
layer_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONT", (0, 0), (-1, 0), HEAD_FONT, 9),
    ("FONT", (0, 1), (0, -1), HEAD_FONT_REG, 9),
    ("FONT", (1, 1), (-1, -1), BODY_FONT, 8.5),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(layer_table)

# ---------- 3. THE 14 PAGES ----------
story.append(Paragraph("3. The Fourteen Pages of the Application", styles["h1"]))
story.append(Paragraph(
    "The application is a multi-page application (MPA). Every page is dedicated to a specific technology or scope, "
    "addressable by URL hash (#/snowflake, #/databricks, etc.). The first ten pages are the architecture pages — "
    "sources, lakehouse, warehouse, transformation, orchestration, analytics, activation, governance, CI/CD. "
    "The last four pages form the Knowledge Loop, a unique feature that turns the platform from a static reference "
    "into a living, citation-driven organism.",
    styles["body"]))

pages_data = [
    ["#", "Page", "Scope"],
    ["1",  "Platform Overview",          "Executive KPIs, mini architecture diagram, design principles"],
    ["2",  "Reference Architecture",     "End-to-end diagram, layer-by-layer responsibilities, environment matrix"],
    ["3",  "Fivetran & Hightouch",       "ELT ingestion from 14 sources, reverse-ETL activation into 5 audiences"],
    ["4",  "Databricks Lakehouse",       "PySpark, Delta Lake, Medallion Bronze/Silver/Gold, Photon runtime"],
    ["5",  "Snowflake & SQL",            "Multi-cluster warehouses, RBAC, Gold SECURE VIEW, cluster keys"],
    ["6",  "dbt & Dimensional Modelling", "312 models, 1,184 tests, SCD2 snapshots, MetricFlow semantic layer, slim CI"],
    ["7",  "Airflow & Dagster",          "Idempotent DAGs, SLA monitoring, partition-aware backfill"],
    ["8",  "Tableau & Analytics",        "Certified datasets, RLS via session context, sample dashboards"],
    ["9",  "Data Governance & Observability", "Unity Catalogue grants, PII tags, Monte Carlo monitors, OpenLineage"],
    ["10", "Git, CI/CD & DevOps",        "Trunk-based flow, GitHub Actions, Terraform, OIDC, FinOps chart"],
    ["11", "About & Compliance",         "Mission, synthetic-data disclaimer, GDPR rights table, contact, repo links"],
    ["12", "Knowledge Hub",              "12 ADRs, 8 patterns, 4 trade-off matrices — the why behind every choice"],
    ["13", "Live Dashboard",             "Synthetic real-time observatory — pipeline runs, cost, anomalies, what-if simulator"],
    ["14", "Evolution Timeline",         "Versioned history v1.0 → v2.4 → v3.0, tech radar, 4-horizon future roadmap"],
    ["15", "Research Papers",            "16 academic foundations, citation graph, paper-to-platform mapping"],
]
pages_table = Table(pages_data, colWidths=[USABLE_W * 0.06, USABLE_W * 0.30, USABLE_W * 0.64])
pages_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONT", (0, 0), (-1, 0), HEAD_FONT, 9),
    ("FONT", (0, 1), (0, -1), HEAD_FONT_REG, 9),
    ("ALIGN", (0, 1), (0, -1), "CENTER"),
    ("FONT", (1, 1), (1, -1), HEAD_FONT_REG, 9),
    ("FONT", (2, 1), (2, -1), BODY_FONT, 8.5),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    # Highlight the Knowledge Loop pages (12-15)
    ("BACKGROUND", (0, 12), (-1, 15), colors.HexColor("#fef3c7")),
]))
story.append(pages_table)

# ---------- 4. KNOWLEDGE LOOP ----------
story.append(Paragraph("4. The Knowledge Loop — what makes this platform different", styles["h1"]))
story.append(Paragraph(
    "Most reference architectures are read-once diagrams. You read them, you leave. The Knowledge Loop turns the "
    "ModernDataSciEng Platform into a living organism by closing a circuit between four pages: Research → Knowledge → "
    "Architecture → Dashboard → back to Research. Papers inspire patterns; patterns become architecture; architecture "
    "is observed in the live dashboard; observations drive new research (new papers to read, new ADRs to write, new "
    "patterns to try). The platform is never finished — it's an ongoing conversation between theory and production.",
    styles["body"]))

story.append(Paragraph("The loop in detail", styles["h2"]))
loop_data = [
    ["Step", "Page", "What it does"],
    ["1", "Research Papers",
     "16 academic foundations (MapReduce, RDDs, Delta Lake, Kimball, Lakehouse, OpenLineage). "
     "Interactive citation graph + paper-to-platform mapping. Every architectural pattern is traceable to its origin."],
    ["2", "Knowledge Hub",
     "12 Architecture Decision Records (ADRs) — context, decision, consequences, alternatives considered. "
     "8 reusable patterns with when-to-use, when-not-to-use, failure modes. 4 trade-off matrices."],
    ["3", "Architecture pages",
     "Ten pages (Snowflake, Databricks, dbt, Tableau, Fivetran/Hightouch, Airflow, Unity Catalogue, CI/CD) — "
     "the actual implementation. Each page cross-references the ADRs that motivated it."],
    ["4", "Live Dashboard",
     "Synthetic real-time observatory — pipeline runs tick in every 3s, credits burn, anomalies flow. "
     "What-if simulator projects cost + P95 latency from load + compute allocation."],
]
loop_table = Table(loop_data, colWidths=[USABLE_W * 0.06, USABLE_W * 0.20, USABLE_W * 0.74])
loop_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONT", (0, 0), (-1, 0), HEAD_FONT, 9),
    ("FONT", (0, 1), (0, -1), HEAD_FONT, 11),
    ("ALIGN", (0, 1), (0, -1), "CENTER"),
    ("TEXTCOLOR", (0, 1), (0, -1), PRIMARY),
    ("FONT", (1, 1), (1, -1), HEAD_FONT_REG, 9.5),
    ("FONT", (2, 1), (2, -1), BODY_FONT, 9),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(loop_table)

story.append(Paragraph(
    "The honest framing: the loop is never closed perfectly. Some academic foundations don't have ADRs yet; some "
    "patterns aren't documented; some dashboard observations don't make it back to research. The loop is an "
    "aspiration — a discipline the team practices — not a state it achieves.",
    styles["quote"]))

# ---------- 5. GOVERNANCE & COMPLIANCE ----------
story.append(Paragraph("5. Governance & GDPR Compliance", styles["h1"]))
story.append(Paragraph(
    "The platform treats governance as a first-class engineering concern, not a compliance afterthought. "
    "Unity Catalogue provides column-level RBAC and PII tagging; Monte Carlo detects freshness, volume and "
    "schema-drift anomalies; OpenLineage ties everything together end-to-end. PII columns are tagged, surfaced "
    "through _masked views with role-based redaction, and access is audited.",
    styles["body"]))

story.append(Paragraph("GDPR rights operationalised as engineering controls", styles["h2"]))
gdpr_data = [
    ["GDPR Right", "Engineering Implementation"],
    ["Right of access (Art. 15)",         "Unity Catalogue audit log + access reviews"],
    ["Right to rectification (Art. 16)",  "dbt snapshot history + MERGE on business key"],
    ["Right to erasure (Art. 17)",        "Delta DELETE + VACUUM + downstream dbt re-run"],
    ["Right to data portability (Art. 20)", "Snowflake secure sharing + Parquet export"],
    ["Right to object (Art. 21)",         "Opt-out registry synced from Zendesk → Hightouch"],
    ["Right to restrict processing (Art. 18)", "RLS policy + Immuta masking toggle"],
]
gdpr_table = Table(gdpr_data, colWidths=[USABLE_W * 0.40, USABLE_W * 0.60])
gdpr_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONT", (0, 0), (-1, 0), HEAD_FONT, 9),
    ("FONT", (0, 1), (0, -1), HEAD_FONT_REG, 9),
    ("FONT", (1, 1), (1, -1), MONO_FONT, 8.5),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(gdpr_table)
story.append(Spacer(1, 4 * mm))
story.append(Paragraph(
    "Data subject requests (DSARs) are acknowledged within 72 hours and fulfilled within 30 days, in line with "
    "GDPR Article 12. All PII columns are tagged in Unity Catalogue; the same tags drive Hightouch masking "
    "and Tableau access. The synthetic data disclaimer applies throughout: no real personal data is processed, "
    "stored or transmitted anywhere in this reference implementation.",
    styles["body"]))

# ---------- 6. FUTURE TECHNOLOGY THOUGHTS ----------
story.append(Paragraph("6. Thoughts on Ever-Evolving Technologies", styles["h1"]))
story.append(Paragraph(
    "What follows is opinionated, dated, and deliberately provocative. It is a watch list for the next 24-36 "
    "months, not a commitment list. The full document lives in FUTURE_TECH.md in the repository; this section "
    "summarises the highest-confidence bets.",
    styles["body"]))

story.append(Paragraph("Storage & formats", styles["h2"]))
story.append(Paragraph(
    "Delta Uniform (Iceberg interop) will be table stakes by FY27 — plan for it now. DuckDB-in-CI is a Q2 priority "
    "to validate dbt models against sample data without provisioning a warehouse. Polars replaces Pandas in our "
    "PySpark ad-hoc notebooks by FY26 H2. Confidential compute on object stores (SGX, SEV-SNP, TDX) is niche today "
    "but will be mainstream by FY28; build the platform so it can be enabled per-table when needed.",
    styles["body"]))

story.append(Paragraph("Compute", styles["h2"]))
story.append(Paragraph(
    "Snowflake Cortex and Databricks AI Functions are putting LLM inference inside the warehouse, eliminating "
    "the ETL-into-ML-system pattern for many use cases. By FY27, most NLP-on-customer-feedback and PII-detection "
    "workloads will run inside the warehouse without a separate ML pipeline. Quantum-safe encryption is low "
    "priority for FY26 but watch vendor PQC roadmaps; plan for a migration window starting FY28.",
    styles["body"]))

story.append(Paragraph("Modelling & orchestration", styles["h2"]))
story.append(Paragraph(
    "Streaming-native transformations (Spark readStream + Delta CDF + Kafka) blur the batch/streaming line; "
    "streaming-first Bronze moves from trial to adopt in FY26 Q2. Asset-based orchestration (Dagster) is becoming "
    "the de-facto mental model — Airflow 3.0 adopts it. The plan is to migrate 50% of DAGs to Dagster assets by "
    "FY26 H2, 100% by FY27. OpenTelemetry everywhere will make observability vendor-neutral by FY27.",
    styles["body"]))

story.append(Paragraph("AI & agents", styles["h2"]))
story.append(Paragraph(
    "The biggest bet is the agentic operating model — DQ triage agents, schema-drift PR agents, cost optimisation "
    "agents, semantic Q&A agents. The hypothesis: agents reduce on-call load by 60% and pipeline delivery from "
    "2 weeks to 2 days. The risk: agents making schema changes autonomously. The mitigation: human approval for "
    "every PR, immutable audit log, daily LLM-token cost cap, PII never leaves the warehouse. The full design "
    "lives in AGENTIC_WORKFLOW.md in the repository.",
    styles["body"]))

story.append(Paragraph("Libraries & languages", styles["h2"]))
story.append(Paragraph(
    "Rust is becoming the implementation language for high-performance data tooling (Polars, DataFusion, "
    "Apache Arrow core, Vector.dev). The modern Python stack is consolidating around Polars + Pydantic v2 + uv + "
    "ruff + maturin. The frontend stack (Next.js + TypeScript + Tailwind 4 + shadcn/ui + Bun) is settled — "
    "watch Million.js for React performance and TanStack Start for full-stack TS framework disruption.",
    styles["body"]))

# ---------- 7. CLOSING ----------
story.append(Paragraph("7. Closing — how to use this platform", styles["h1"]))
story.append(Paragraph(
    "This report is the entry point. The application is the platform. Read this PDF for the executive summary; "
    "browse the public repository for the source code; clone the private repository to make modifications. The "
    "sync workflow mirrors every push to the private repo into the public one — anyone can preview the latest "
    "state of the platform without signing an NDA. If you find an architectural choice you'd challenge, write "
    "an ADR. If you find a research paper that should be in the citation graph, open a PR. The platform evolves "
    "because the team is honest about which assumptions held and which didn't.",
    styles["body"]))

story.append(Spacer(1, 6 * mm))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
story.append(Spacer(1, 4 * mm))
story.append(Paragraph(
    "Synthetic data disclaimer: every number, schema, pipeline, dashboard and business name in this report is "
    "synthetic and hypothetical. Any resemblance to real companies, persons, products or events is coincidental. "
    "If you would like to validate any figure shown here against a real business, please contact the team — "
    "the synthetic numbers are illustrative only.",
    styles["small"]))

# ============================================================
# Build PDF
# ============================================================
output_path = "/home/z/my-project/download/ModernDataSciEng-Platform.pdf"
os.makedirs(os.path.dirname(output_path), exist_ok=True)

doc = BaseDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
    title="ModernDataSciEng Platform — Project Report",
    author="ModernDataSciEng Ltd",
    subject="Reference architecture, governance, and future technology watch",
    creator="ModernDataSciEng Platform",
)

frame = Frame(LEFT_MARGIN, BOTTOM_MARGIN, USABLE_W,
              PAGE_H - TOP_MARGIN - BOTTOM_MARGIN, id="body")

doc.addPageTemplates([
    PageTemplate(id="cover", frames=[frame], onPage=cover_page),
    PageTemplate(id="body",  frames=[frame], onPage=body_page),
])

# Switch from cover to body template after the first page break
from reportlab.platypus.doctemplate import NextPageTemplate
story_with_template_switch = [
    NextPageTemplate("body"),
] + story

doc.build(story_with_template_switch, canvasmaker=PageNumCanvas)

# Verify
import os
size_kb = os.path.getsize(output_path) / 1024
print(f"✓ PDF generated: {output_path}")
print(f"  Size: {size_kb:.1f} KB")

# Page count
try:
    import pypdf
    with open(output_path, "rb") as f:
        reader = pypdf.PdfReader(f)
        print(f"  Pages: {len(reader.pages)}")
except Exception as e:
    print(f"  Page count check skipped: {e}")
