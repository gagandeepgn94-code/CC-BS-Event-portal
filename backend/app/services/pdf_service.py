"""
PDF generation service for certificates and event dossier reports.

Uses reportlab for PDF layout and qrcode for QR code embedding.
Certificates include:
  - College / portal branding header
  - Student name and event title
  - Certificate type (participation / winner) with rank/prize if applicable
  - QR code linking to the public verification URL

Dossier report includes:
  - Event metadata
  - Registration and attendance summary
  - Winners list
"""
from __future__ import annotations

import io
import uuid
from datetime import datetime, timezone

import qrcode
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Colour palette ─────────────────────────────────────────────────────────────
PRIMARY = colors.HexColor("#1a237e")   # deep indigo
ACCENT  = colors.HexColor("#e53935")   # red accent
GOLD    = colors.HexColor("#f9a825")   # winner gold
LIGHT   = colors.HexColor("#e8eaf6")   # background strip
TEXT    = colors.HexColor("#212121")

PORTAL_NAME = "CC-BS Events Portal"


# ── QR code helper ─────────────────────────────────────────────────────────────

def _qr_image(data: str, size_cm: float = 3.5) -> Image:
    """Return a ReportLab Image from a QR-encoded string."""
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Image(buf, width=size_cm * cm, height=size_cm * cm)


# ── Certificate PDF ────────────────────────────────────────────────────────────

def generate_certificate_pdf(
    student_name: str,
    usn: str | None,
    event_title: str,
    event_date: datetime | None,
    cert_type: str,          # "participation" | "winner"
    rank: int | None,
    prize_details: str | None,
    verification_code: str,
    verification_base_url: str,  # e.g. "https://example.com/verify"
) -> bytes:
    """
    Generate a single certificate PDF and return raw bytes.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Title"],
        fontSize=32,
        textColor=PRIMARY,
        alignment=TA_CENTER,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    sub_style = ParagraphStyle(
        "CertSub",
        parent=styles["Normal"],
        fontSize=13,
        textColor=TEXT,
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    name_style = ParagraphStyle(
        "CertName",
        parent=styles["Normal"],
        fontSize=26,
        textColor=ACCENT if cert_type == "winner" else PRIMARY,
        alignment=TA_CENTER,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle(
        "CertBody",
        parent=styles["Normal"],
        fontSize=12,
        textColor=TEXT,
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    small_style = ParagraphStyle(
        "CertSmall",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER,
    )

    cert_label = "Certificate of Achievement" if cert_type == "winner" else "Certificate of Participation"
    date_str   = event_date.strftime("%B %d, %Y") if event_date else "—"
    verify_url = f"{verification_base_url}/{verification_code}"

    # ── Build story ────────────────────────────────────────────────────────────
    story = [
        Paragraph(PORTAL_NAME, sub_style),
        Spacer(1, 0.3 * cm),
        HRFlowable(width="100%", thickness=2, color=PRIMARY),
        Spacer(1, 0.4 * cm),
        Paragraph(cert_label.upper(), title_style),
        Spacer(1, 0.3 * cm),
        Paragraph("This is to certify that", body_style),
        Spacer(1, 0.2 * cm),
        Paragraph(student_name + (f" ({usn})" if usn else ""), name_style),
        Spacer(1, 0.2 * cm),
        Paragraph(
            f"has successfully {'won' if cert_type == 'winner' else 'participated in'} the event",
            body_style,
        ),
        Spacer(1, 0.2 * cm),
        Paragraph(f"<b>{event_title}</b>", ParagraphStyle("bold_center", parent=body_style, fontSize=16, textColor=PRIMARY)),
        Spacer(1, 0.1 * cm),
        Paragraph(f"held on {date_str}", body_style),
    ]

    if cert_type == "winner":
        rank_text = f"Rank: <b>#{rank}</b>" if rank else ""
        prize_text = f"Prize: <b>{prize_details}</b>" if prize_details else ""
        combined = " &nbsp;&nbsp;|&nbsp;&nbsp; ".join(filter(None, [rank_text, prize_text]))
        if combined:
            story += [
                Spacer(1, 0.3 * cm),
                Paragraph(combined, ParagraphStyle("winner_meta", parent=body_style, textColor=GOLD, fontSize=13)),
            ]

    story += [
        Spacer(1, 0.5 * cm),
        HRFlowable(width="80%", thickness=1, color=colors.lightgrey),
        Spacer(1, 0.3 * cm),
    ]

    # QR code + verification note side by side
    qr_img = _qr_image(verify_url, size_cm=3.0)
    verify_para = Paragraph(
        f"Scan to verify authenticity<br/>"
        f"<font size='7' color='grey'>{verification_code}</font>",
        ParagraphStyle("qr_note", parent=body_style, fontSize=9, textColor=colors.grey),
    )
    qr_table = Table([[qr_img, verify_para]], colWidths=[3.5 * cm, 12 * cm])
    qr_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    story.append(qr_table)

    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(f"Issued: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", small_style))

    doc.build(story)
    buf.seek(0)
    return buf.read()


# ── Dossier report PDF ─────────────────────────────────────────────────────────

def generate_dossier_pdf(
    event_title: str,
    event_date: datetime | None,
    location: str | None,
    total_registrations: int,
    attendance_count: int,
    winners: list[dict],  # [{name, usn, rank, score, prize_details}, ...]
) -> bytes:
    """
    Generate a summary dossier PDF and return raw bytes.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], textColor=PRIMARY, fontSize=18, spaceAfter=6)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=PRIMARY, fontSize=13, spaceAfter=4)
    body = ParagraphStyle("body", parent=styles["Normal"], fontSize=11, spaceAfter=3, textColor=TEXT)
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=8, textColor=colors.grey)

    date_str = event_date.strftime("%B %d, %Y") if event_date else "—"
    attendance_pct = (
        f"{attendance_count / total_registrations * 100:.1f}%"
        if total_registrations > 0 else "N/A"
    )

    story = [
        Paragraph(PORTAL_NAME, ParagraphStyle("portal", parent=small, alignment=TA_CENTER)),
        Spacer(1, 0.3 * cm),
        Paragraph("Event Dossier Report", h1),
        HRFlowable(width="100%", thickness=2, color=PRIMARY),
        Spacer(1, 0.4 * cm),
        Paragraph(f"<b>Event:</b> {event_title}", body),
        Paragraph(f"<b>Date:</b> {date_str}", body),
        Paragraph(f"<b>Venue:</b> {location or '—'}", body),
        Spacer(1, 0.4 * cm),
        Paragraph("Summary Statistics", h2),
        HRFlowable(width="100%", thickness=1, color=LIGHT),
        Spacer(1, 0.2 * cm),
    ]

    stats_data = [
        ["Metric", "Value"],
        ["Total Registrations", str(total_registrations)],
        ["Attendance", f"{attendance_count} ({attendance_pct})"],
        ["No-shows", str(total_registrations - attendance_count)],
        ["Winners recognised", str(len(winners))],
    ]
    stats_table = Table(stats_data, colWidths=[8 * cm, 6 * cm])
    stats_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story += [stats_table, Spacer(1, 0.6 * cm)]

    if winners:
        story.append(Paragraph("Winners", h2))
        story.append(HRFlowable(width="100%", thickness=1, color=LIGHT))
        story.append(Spacer(1, 0.2 * cm))

        win_data = [["Rank", "Name", "USN", "Score", "Prize"]]
        for w in sorted(winners, key=lambda x: (x.get("rank") or 999)):
            win_data.append([
                f"#{w.get('rank', '—')}",
                w.get("name", ""),
                w.get("usn") or "—",
                f"{float(w['score']):.2f}" if w.get("score") is not None else "—",
                w.get("prize_details") or "—",
            ])
        win_table = Table(win_data, colWidths=[2 * cm, 6 * cm, 3.5 * cm, 2.5 * cm, 4 * cm])
        win_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), GOLD),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(win_table)

    story += [
        Spacer(1, 0.6 * cm),
        HRFlowable(width="100%", thickness=1, color=colors.lightgrey),
        Spacer(1, 0.2 * cm),
        Paragraph(
            f"Generated by {PORTAL_NAME} on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            small,
        ),
    ]

    doc.build(story)
    buf.seek(0)
    return buf.read()
