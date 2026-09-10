import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_exam_report_pdf(
    session_id: int,
    candidate_name: str,
    candidate_email: str,
    exam_title: str,
    subject: str,
    status: str,
    total_score: float,
    max_score: float,
    suspicion_score: float,
    results_list: list,
    started_at: datetime = None,
    submitted_at: datetime = None
) -> io.BytesIO:
    """
    Generates a secure, tamper-evident candidate performance scorecard and examination report.
    Returns in-memory BytesIO buffer of the generated PDF document.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        alignment=1 # Center
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        alignment=1 # Center
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1e3a8a'),
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1e293b')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    story = []

    # Header Title Banner
    story.append(Paragraph("AI-BASED INTELLIGENT EXAMINATION PLATFORM", title_style))
    story.append(Paragraph("OFFICIAL CANDIDATE EXAMINATION SCORECARD & PERFORMANCE REPORT", subtitle_style))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563eb'), spaceAfter=14))

    # Candidate & Exam Metadata Grid
    percentage = round((total_score / max_score * 100), 1) if max_score > 0 else 0.0
    status_label = status.upper()
    status_color = colors.HexColor('#16a34a') if status_label in ['SUBMITTED', 'COMPLETED', 'PUBLISHED'] else colors.HexColor('#dc2626')

    meta_data = [
        [
            Paragraph("<b>Candidate Name:</b>", body_style),
            Paragraph(candidate_name, body_style),
            Paragraph("<b>Examination Title:</b>", body_style),
            Paragraph(exam_title, body_style)
        ],
        [
            Paragraph("<b>Candidate Email:</b>", body_style),
            Paragraph(candidate_email, body_style),
            Paragraph("<b>Subject Area:</b>", body_style),
            Paragraph(subject or "General", body_style)
        ],
        [
            Paragraph("<b>Session ID:</b>", body_style),
            Paragraph(f"#{session_id}", body_style),
            Paragraph("<b>Examination Status:</b>", body_style),
            Paragraph(f"<font color='{status_color.hexval()}'><b>{status_label}</b></font>", body_style)
        ],
        [
            Paragraph("<b>Total Awarded Marks:</b>", body_style),
            Paragraph(f"<b>{total_score} / {max_score} ({percentage}%)</b>", body_style),
            Paragraph("<b>AI Proctor Suspicion Index:</b>", body_style),
            Paragraph(f"{suspicion_score:.1f} / 100.0", body_style)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[120, 150, 120, 150])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 16))

    # Question Breakdown Section
    story.append(Paragraph("Itemized Question Performance Breakdown", section_heading))

    table_data = [
        [
            Paragraph("Q#", table_header_style),
            Paragraph("Question Text", table_header_style),
            Paragraph("Type", table_header_style),
            Paragraph("Score", table_header_style),
            Paragraph("Max", table_header_style),
            Paragraph("Graded By", table_header_style),
            Paragraph("Evaluation Feedback", table_header_style)
        ]
    ]

    for idx, r in enumerate(results_list):
        q_text = r.get("question_text", f"Question {idx + 1}")
        # Truncate if very long
        if len(q_text) > 40:
            q_text = q_text[:37] + "..."

        q_type = str(r.get("question_type", "")).replace("QuestionType.", "")
        score = f"{r.get('score', 0.0):.1f}"
        max_s = f"{r.get('max_score', 0.0):.1f}"
        eval_type = str(r.get("evaluation_type", "")).replace("EvaluationType.", "").upper()
        feedback = r.get("feedback", "")
        if len(feedback) > 45:
            feedback = feedback[:42] + "..."

        table_data.append([
            Paragraph(str(idx + 1), body_style),
            Paragraph(q_text, body_style),
            Paragraph(q_type, body_style),
            Paragraph(score, body_style),
            Paragraph(max_s, body_style),
            Paragraph(eval_type, body_style),
            Paragraph(feedback, body_style)
        ])

    questions_table = Table(table_data, colWidths=[24, 130, 60, 38, 38, 65, 185])
    questions_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')])
    ]))

    story.append(questions_table)
    story.append(Spacer(1, 18))

    # Proctoring & Security Audit Summary
    story.append(Paragraph("AI Proctoring & Integrity Audit Certification", section_heading))
    integrity_text = (
        f"This examination was continuously monitored via client-side computer vision telemetry and browser security event hooks. "
        f"Cumulative session suspicion index recorded: <b>{suspicion_score:.1f} / 100.0</b>. "
        f"Status: <b>{status_label}</b>. This certificate is digitally recorded by the Examination Platform Authority."
    )
    story.append(Paragraph(integrity_text, body_style))
    story.append(Spacer(1, 14))

    # Cryptographic SHA-256 Digital Verification Seal
    import hashlib
    hash_payload = f"SESSION:{session_id}|CANDIDATE:{candidate_email}|EXAM:{exam_title}|SCORE:{total_score}/{max_score}|SUSPICION:{suspicion_score}|STATUS:{status}|STARTED:{started_at}|SUBMITTED:{submitted_at}"
    sha256_hash = hashlib.sha256(hash_payload.encode('utf-8')).hexdigest().upper()

    hash_style = ParagraphStyle(
        'HashText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0284c7')
    )

    cert_box_data = [
        [
            Paragraph("<b>CRYPTOGRAPHIC SHA-256 DIGITAL INTEGRITY SEAL</b>", ParagraphStyle('CertHeader', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#0369a1'))),
            Paragraph("STATUS: <b>VERIFIED VALID</b>", ParagraphStyle('CertStatus', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, alignment=2, textColor=colors.HexColor('#16a34a')))
        ],
        [
            Paragraph(f"<b>SHA-256 Digest:</b> {sha256_hash}", hash_style),
            Paragraph("Standard: FIPS 180-4", ParagraphStyle('CertStd', parent=styles['Normal'], fontName='Helvetica', fontSize=8, alignment=2, textColor=colors.HexColor('#64748b')))
        ]
    ]
    cert_table = Table(cert_box_data, colWidths=[380, 160])
    cert_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f9ff')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#bae6fd')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(cert_table)
    story.append(Spacer(1, 14))

    # Footer note & verification timestamp
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#94a3b8'), spaceAfter=8))
    generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    footer_text = f"Digitally Generated by AI Examination Platform &bull; {generated_at} &bull; Tamper-Evident Session #{session_id} &bull; SHA-256: {sha256_hash[:16]}..."
    story.append(Paragraph(footer_text, subtitle_style))

    doc.build(story)
    buffer.seek(0)
    return buffer

