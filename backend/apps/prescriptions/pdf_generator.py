from io import BytesIO
from django.utils import timezone


def generate_prescription_pdf(prescription, cancelled=False):
    """
    Generate a professional medical prescription PDF using ReportLab.
    Works reliably without any system-level dependencies (no GTK, no Cairo).
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, KeepTogether
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        from reportlab.platypus import Flowable
    except ImportError:
        return b'%PDF-mock-document-generated'

    buffer = BytesIO()

    # ---------- Document Setup ----------
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    # ---------- Colour Palette ----------
    INDIGO   = colors.HexColor('#4F46E5')
    INDIGO_LIGHT = colors.HexColor('#EEF2FF')
    DARK     = colors.HexColor('#1A1A2E')
    MUTED    = colors.HexColor('#6B7280')
    BORDER   = colors.HexColor('#E5E7EB')
    RED      = colors.HexColor('#DC2626')
    GREEN    = colors.HexColor('#16A34A')
    WHITE    = colors.white

    # ---------- Styles ----------
    styles = getSampleStyleSheet()

    h1 = ParagraphStyle('H1', fontSize=22, textColor=INDIGO,
                        fontName='Helvetica-Bold', spaceAfter=2)
    h2 = ParagraphStyle('H2', fontSize=11, textColor=DARK,
                        fontName='Helvetica-Bold', spaceAfter=4)
    normal = ParagraphStyle('Normal', fontSize=9, textColor=DARK,
                             fontName='Helvetica', spaceAfter=2, leading=14)
    muted_style = ParagraphStyle('Muted', fontSize=8, textColor=MUTED,
                                  fontName='Helvetica', spaceAfter=2)
    centre = ParagraphStyle('Centre', fontSize=9, textColor=DARK,
                             fontName='Helvetica', alignment=TA_CENTER)
    cancelled_style = ParagraphStyle('Cancelled', fontSize=28,
                                      textColor=colors.HexColor('#DC262640'),
                                      fontName='Helvetica-Bold',
                                      alignment=TA_CENTER)

    # ---------- Data Helpers ----------
    doctor = prescription.doctor
    patient = prescription.patient
    doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}"
    patient_name = f"{patient.first_name} {patient.last_name}"
    issued_date = prescription.issued_at.strftime('%d/%m/%Y') if prescription.issued_at else timezone.now().strftime('%d/%m/%Y')
    generated_date = timezone.now().strftime('%d/%m/%Y à %H:%M')

    medication_lines = list(prescription.medication_lines.all())

    # ---------- Story ----------
    story = []

    # ── Header bar ──────────────────────────────────────────────────────────
    header_data = [[
        Paragraph('<b>ORDONNANCE MÉDICALE</b>', ParagraphStyle(
            'HL', fontSize=14, textColor=WHITE, fontName='Helvetica-Bold')),
        Paragraph(f'<b>{doctor_name}</b><br/>'
                  f'<font size="9" color="#D1D5DB">Médecin — MedEra</font>',
                  ParagraphStyle('HR', fontSize=11, textColor=WHITE,
                                  fontName='Helvetica-Bold', alignment=TA_RIGHT)),
    ]]
    header_table = Table(header_data, colWidths=[9.5 * cm, 8 * cm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), INDIGO),
        ('ROUNDEDCORNERS', [8]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (0, -1), 16),
        ('RIGHTPADDING', (-1, 0), (-1, -1), 16),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.5 * cm))

    # ── Issue date row ───────────────────────────────────────────────────────
    story.append(Paragraph(f'Date d\'émission : <b>{issued_date}</b>', muted_style))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=10))

    # ── CANCELLED watermark ──────────────────────────────────────────────────
    if cancelled:
        story.append(Paragraph('⚠ ANNULÉE', cancelled_style))
        story.append(Spacer(1, 0.3 * cm))

    # ── Patient Info ─────────────────────────────────────────────────────────
    allergies_text = ''
    if hasattr(patient, 'allergies') and patient.allergies:
        allergies_raw = patient.allergies
        if isinstance(allergies_raw, list):
            allergies_list = ', '.join(allergies_raw)
        else:
            allergies_list = str(allergies_raw)
        allergies_text = (
            f'<br/><font color="#DC2626"><b>⚠ Allergies :</b> {allergies_list}</font>'
        )

    dob_text = ''
    if hasattr(patient, 'birth_date') and patient.birth_date:
        dob_text = f'<br/>Date de naissance : <b>{patient.birth_date.strftime("%d/%m/%Y")}</b>'

    internal_id = getattr(patient, 'internal_id', None)
    id_text = f'<br/>Dossier : <b>{internal_id}</b>' if internal_id else ''

    patient_data = [[
        Paragraph(
            f'<b>PATIENT</b><br/>'
            f'<font size="11"><b>{patient_name}</b></font>'
            f'{dob_text}{id_text}{allergies_text}',
            normal
        )
    ]]
    patient_table = Table(patient_data, colWidths=[17.5 * cm])
    patient_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), INDIGO_LIGHT),
        ('ROUNDEDCORNERS', [6]),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 0.5 * cm))

    # ── Medications ──────────────────────────────────────────────────────────
    story.append(Paragraph('<b>MÉDICAMENTS PRESCRITS</b>', h2))

    if medication_lines:
        # Table headers
        med_header = [
            Paragraph('<b>Médicament</b>', ParagraphStyle(
                'TH', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold')),
            Paragraph('<b>Dosage</b>', ParagraphStyle(
                'TH', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold')),
            Paragraph('<b>Forme</b>', ParagraphStyle(
                'TH', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold')),
            Paragraph('<b>Posologie</b>', ParagraphStyle(
                'TH', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold')),
            Paragraph('<b>Durée</b>', ParagraphStyle(
                'TH', fontSize=8, textColor=WHITE, fontName='Helvetica-Bold')),
        ]
        rows = [med_header]
        for i, line in enumerate(medication_lines):
            duration_text = f'{line.duration_days}j' if line.duration_days else '—'
            row = [
                Paragraph(f'<b>{line.drug_name}</b>', normal),
                Paragraph(line.dosage or '—', normal),
                Paragraph(line.form or '—', normal),
                Paragraph(line.dosology or '—', normal),
                Paragraph(duration_text, normal),
            ]
            rows.append(row)
            if line.special_instructions:
                instr_row = [
                    Paragraph(f'  ↳ {line.special_instructions}',
                               ParagraphStyle('Instr', fontSize=8,
                                               textColor=MUTED, fontName='Helvetica-Oblique')),
                    '', '', '', ''
                ]
                rows.append(instr_row)

        med_table = Table(rows, colWidths=[5 * cm, 2.8 * cm, 2.5 * cm, 5 * cm, 2.2 * cm])
        # Alternate row colours
        style_cmds = [
            ('BACKGROUND', (0, 0), (-1, 0), INDIGO),
            ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
            ('ROWBACKGROUND', (0, 1), (-1, -1), [WHITE, colors.HexColor('#F9FAFB')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
        ]
        # Span instruction rows
        instr_indices = []
        for idx, row in enumerate(rows):
            if idx > 0 and row[1] == '' and row[2] == '':
                instr_indices.append(idx)
                style_cmds.append(('SPAN', (0, idx), (4, idx)))
                style_cmds.append(('BACKGROUND', (0, idx), (4, idx), colors.HexColor('#F3F4F6')))

        med_table.setStyle(TableStyle(style_cmds))
        story.append(med_table)
    else:
        story.append(Paragraph('Aucun médicament prescrit.', muted_style))

    story.append(Spacer(1, 0.5 * cm))

    # ── General Instructions ─────────────────────────────────────────────────
    if prescription.general_instructions:
        story.append(Paragraph('<b>INSTRUCTIONS GÉNÉRALES</b>', h2))
        story.append(Paragraph(prescription.general_instructions, normal))
        story.append(Spacer(1, 0.4 * cm))

    # ── Renewal Info ─────────────────────────────────────────────────────────
    if prescription.is_renewable:
        story.append(Paragraph(
            f'<font color="#16A34A">✓ Ordonnance renouvelable {prescription.renewal_count} fois</font>',
            normal
        ))
        story.append(Spacer(1, 0.3 * cm))

    # ── Spacer to push footer ────────────────────────────────────────────────
    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER))
    story.append(Spacer(1, 0.3 * cm))

    # ── Signature Block ───────────────────────────────────────────────────────
    sig_data = [[
        Paragraph(
            f'Fait le <b>{issued_date}</b><br/>'
            f'<font size="10"><b>{doctor_name}</b></font><br/>'
            f'<font size="8" color="#6B7280">Ordonnance N° {prescription.id}</font>',
            normal
        ),
        Paragraph(
            '___________________________<br/>'
            '<font size="8" color="#6B7280">Signature et cachet du médecin</font>',
            ParagraphStyle('Sig', fontSize=9, textColor=DARK, alignment=TA_CENTER)
        ),
    ]]
    sig_table = Table(sig_data, colWidths=[10 * cm, 7.5 * cm])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(sig_table)

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(
        f'<font size="7" color="#9CA3AF">Document généré par MedEra le {generated_date}. '
        f'Confidentiel — usage médical uniquement.</font>',
        centre
    ))

    # ---------- Build PDF ----------
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
