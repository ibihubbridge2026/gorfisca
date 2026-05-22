"""
Service de génération de rapports PDF conformes OHADA
Génération de bilans, comptes de résultat, livres comptables
"""
import io
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional

from django.http import HttpResponse
from django.template.loader import get_template
from django.conf import settings

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch, cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


class PDFReportGenerator:
    """
    Générateur de rapports financiers en PDF
    Conforme aux standards OHADA pour les états financiers
    """
    
    def __init__(self):
        if not REPORTLAB_AVAILABLE:
            raise ImportError(
                "ReportLab n'est pas installé. "
                "Installez-le avec: pip install reportlab"
            )
        
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Configuration des styles personnalisés"""
        # Style pour les titres de rapport
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1a1a2e'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Style pour les sous-titres
        self.styles.add(ParagraphStyle(
            name='ReportSubtitle',
            parent=self.styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#666666'),
            spaceAfter=10,
            alignment=TA_CENTER
        ))
        
        # Style pour les en-têtes de tableau
        self.styles.add(ParagraphStyle(
            name='TableHeader',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.white,
            fontName='Helvetica-Bold',
            alignment=TA_CENTER
        ))
        
        # Style pour les cellules de tableau
        self.styles.add(ParagraphStyle(
            name='TableCell',
            parent=self.styles['Normal'],
            fontSize=9,
            leftIndent=6,
            rightIndent=6
        ))
        
        # Style pour les montants
        self.styles.add(ParagraphStyle(
            name='AmountCell',
            parent=self.styles['Normal'],
            fontSize=9,
            alignment=TA_RIGHT,
            rightIndent=6
        ))
    
    def generate_balance_sheet(self, organization, fiscal_year: int, data: Dict) -> HttpResponse:
        """
        Génère le bilan comptable (Actif/Passif)
        
        Args:
            organization: Organisation
            fiscal_year: Année fiscale
            data: Données du bilan structurées
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        elements = []
        
        # En-tête
        elements.append(Paragraph(f"BILAN COMPTABLE", self.styles['ReportTitle']))
        elements.append(Paragraph(f"Exercice {fiscal_year}", self.styles['ReportSubtitle']))
        elements.append(Paragraph(f"{organization.name}", self.styles['ReportSubtitle']))
        elements.append(Paragraph(f"NIF: {organization.legal_identifier}", self.styles['ReportSubtitle']))
        elements.append(Spacer(1, 0.3*inch))
        
        # Actif
        elements.append(Paragraph("ACTIF", self.styles['Heading3']))
        actif_data = self._prepare_table_data(data.get('actif', []), ['Code', 'Libellé', 'Brut', 'Amort.', 'Net'])
        actif_table = Table(actif_data, colWidths=[1.2*cm, 5*cm, 2*cm, 2*cm, 2*cm])
        actif_table.setStyle(self._get_table_style())
        elements.append(actif_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Passif
        elements.append(Paragraph("PASSIF", self.styles['Heading3']))
        passif_data = self._prepare_table_data(data.get('passif', []), ['Code', 'Libellé', 'Montant'])
        passif_table = Table(passif_data, colWidths=[1.2*cm, 5*cm, 3.8*cm])
        passif_table.setStyle(self._get_table_style())
        elements.append(passif_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Pied de page
        elements.append(Spacer(1, 0.5*inch))
        footer_text = f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} - GORFISCA v2.0"
        elements.append(Paragraph(footer_text, self.styles['Normal']))
        
        # Construction du PDF
        doc.build(elements)
        
        # Création de la réponse HTTP
        pdf = buffer.getvalue()
        buffer.close()
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="bilan_{organization.legal_identifier}_{fiscal_year}.pdf"'
        response.write(pdf)
        
        return response
    
    def generate_income_statement(self, organization, fiscal_year: int, data: Dict) -> HttpResponse:
        """
        Génère le compte de résultat
        
        Args:
            organization: Organisation
            fiscal_year: Année fiscale
            data: Données du CR structurées
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        elements = []
        
        # En-tête
        elements.append(Paragraph("COMPTE DE RÉSULTAT", self.styles['ReportTitle']))
        elements.append(Paragraph(f"Exercice {fiscal_year}", self.styles['ReportSubtitle']))
        elements.append(Paragraph(f"{organization.name}", self.styles['ReportSubtitle']))
        elements.append(Spacer(1, 0.3*inch))
        
        # Tableau
        cr_data = self._prepare_table_data(
            data.get('lines', []),
            ['Rubrique', 'Montant N', 'Montant N-1']
        )
        cr_table = Table(cr_data, colWidths=[6*cm, 3*cm, 3*cm])
        cr_table.setStyle(self._get_table_style())
        elements.append(cr_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Résultat net
        net_result = data.get('net_result', 0)
        result_style = self.styles['Heading3']
        result_color = colors.green if net_result >= 0 else colors.red
        result_text = f"RÉSULTAT NET: {abs(net_result):,.2f} {'BÉNÉFICE' if net_result >= 0 else 'PERTE'}"
        elements.append(Paragraph(result_text, result_style))
        
        # Pied de page
        elements.append(Spacer(1, 0.5*inch))
        footer_text = f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} - GORFISCA v2.0"
        elements.append(Paragraph(footer_text, self.styles['Normal']))
        
        doc.build(elements)
        
        pdf = buffer.getvalue()
        buffer.close()
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="cr_{organization.legal_identifier}_{fiscal_year}.pdf"'
        response.write(pdf)
        
        return response
    
    def generate_general_ledger(self, organization, account_code: str, data: List[Dict]) -> HttpResponse:
        """
        Génère le grand livre d'un compte
        
        Args:
            organization: Organisation
            account_code: Code du compte
            data: Liste des écritures
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        elements = []
        
        # En-tête
        elements.append(Paragraph("GRAND LIVRE", self.styles['ReportTitle']))
        elements.append(Paragraph(f"Compte: {account_code}", self.styles['ReportSubtitle']))
        elements.append(Paragraph(f"{organization.name}", self.styles['ReportSubtitle']))
        elements.append(Spacer(1, 0.3*inch))
        
        # Tableau
        ledger_data = [
            ['Date', 'Référence', 'Libellé', 'Débit', 'Crédit', 'Solde']
        ]
        
        running_balance = Decimal('0')
        for entry in data:
            amount = Decimal(str(entry.get('amount', 0)))
            if entry.get('line_type') == 'debit':
                running_balance += amount
                debit = f"{amount:,.2f}"
                credit = ""
            else:
                running_balance -= amount
                debit = ""
                credit = f"{amount:,.2f}"
            
            ledger_data.append([
                entry.get('date', ''),
                entry.get('reference', ''),
                entry.get('description', '')[:40],
                debit,
                credit,
                f"{running_balance:,.2f}"
            ])
        
        ledger_table = Table(ledger_data, colWidths=[2*cm, 2.5*cm, 5*cm, 2*cm, 2*cm, 2*cm])
        ledger_table.setStyle(self._get_table_style())
        elements.append(ledger_table)
        
        # Solde final
        elements.append(Spacer(1, 0.2*inch))
        balance_text = f"Solde final: {running_balance:,.2f} {'Débiteur' if running_balance > 0 else 'Créditeur' if running_balance < 0 else 'Nul'}"
        elements.append(Paragraph(balance_text, self.styles['Heading3']))
        
        # Pied de page
        elements.append(Spacer(1, 0.5*inch))
        footer_text = f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} - GORFISCA v2.0"
        elements.append(Paragraph(footer_text, self.styles['Normal']))
        
        doc.build(elements)
        
        pdf = buffer.getvalue()
        buffer.close()
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="grand_livre_{account_code}.pdf"'
        response.write(pdf)
        
        return response
    
    def _prepare_table_data(self, rows: List[Dict], headers: List[str]) -> List[List]:
        """Prépare les données pour un tableau ReportLab"""
        data = [headers]
        
        for row in rows:
            data_row = []
            for header in headers:
                value = row.get(header.lower(), row.get(header, ''))
                if isinstance(value, (int, float, Decimal)):
                    data_row.append(f"{value:,.2f}")
                else:
                    data_row.append(str(value))
            data.append(data_row)
        
        return data
    
    def _get_table_style(self) -> TableStyle:
        """Retourne le style commun pour les tableaux"""
        return TableStyle([
            # En-tête
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Lignes de données
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Alignement des montants à droite
            ('ALIGN', (-3, 1), (-1, -1), 'RIGHT'),
        ])
    
    def generate_invoice_pdf(self, invoice_data: Dict) -> HttpResponse:
        """
        Génère une facture client
        
        Args:
            invoice_data: Données de la facture
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        elements = []
        
        # En-tête
        elements.append(Paragraph("FACTURE", self.styles['ReportTitle']))
        elements.append(Paragraph(f"N° {invoice_data.get('number', 'N/A')}", self.styles['ReportSubtitle']))
        elements.append(Spacer(1, 0.3*inch))
        
        # Informations émetteur et client
        info_table = Table([
            ['ÉMETTEUR', 'CLIENT'],
            [invoice_data.get('issuer_name', ''), invoice_data.get('client_name', '')],
            [invoice_data.get('issuer_address', ''), invoice_data.get('client_address', '')],
            [f"NIF: {invoice_data.get('issuer_nif', '')}", f"NIF: {invoice_data.get('client_nif', '')}"],
        ], colWidths=[7*cm, 7*cm])
        info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Détails de la facture
        details_table = Table([
            ['Date', 'Référence', 'Échéance'],
            [
                invoice_data.get('date', ''),
                invoice_data.get('reference', ''),
                invoice_data.get('due_date', '')
            ],
        ], colWidths=[5*cm, 5*cm, 5*cm])
        details_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Articles
        items_data = [['Description', 'Quantité', 'Prix Unit.', 'Total']]
        for item in invoice_data.get('items', []):
            total = item.get('quantity', 1) * item.get('unit_price', 0)
            items_data.append([
                item.get('description', ''),
                str(item.get('quantity', 1)),
                f"{item.get('unit_price', 0):,.2f}",
                f"{total:,.2f}"
            ])
        
        # Total
        items_data.append(['', '', 'Total HT:', f"{invoice_data.get('total_ht', 0):,.2f}"])
        items_data.append(['', '', 'TVA:', f"{invoice_data.get('tva', 0):,.2f}"])
        items_data.append(['', '', 'Total TTC:', f"{invoice_data.get('total_ttc', 0):,.2f}"])
        
        items_table = Table(items_data, colWidths=[7*cm, 2*cm, 3*cm, 3*cm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTNAME', (-2, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (-2, -1), (-1, -1), colors.HexColor('#e8f5e9')),
        ]))
        elements.append(items_table)
        
        # Pied de page
        elements.append(Spacer(1, 0.5*inch))
        footer_text = f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} - GORFISCA v2.0"
        elements.append(Paragraph(footer_text, self.styles['Normal']))
        
        doc.build(elements)
        
        pdf = buffer.getvalue()
        buffer.close()
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="facture_{invoice_data.get("number", "unknown")}.pdf"'
        response.write(pdf)
        
        return response
