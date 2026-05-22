import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import Organization
from apps.users.models import User
from apps.accounting.models import Account
from apps.currencies.models import Currency # Assure-toi que ce modèle existe

def run_seed():
    print("🚀 Initialisation GORFISCA v2.0 - Pan-African Edition...")

    # 1. Création/Récupération des Devises Pivots
    currencies = [
        ('XOF', 'Franc CFA (BCEAO)', 'FCFA'),
        ('NGN', 'Nigerian Naira', '₦'),
        ('GHS', 'Ghanaian Cedi', 'GH₵'),
        ('ZAR', 'South African Rand', 'R'),
        ('EUR', 'Euro', '€'),
    ]
    for code, name, symbol in currencies:
        Currency.objects.update_or_create(code=code, defaults={'name': name, 'symbol': symbol})
    print(f"🌍 {len(currencies)} Devises configurées.")

    # 2. Création de l'Organisation
    org, _ = Organization.objects.get_or_create(
        name="Ibi Hub Bridge - HQ",
        defaults={'legal_identifier': 'IBI-HUB-2026-HQ'}
    )
    
    # 3. Plan Comptable OHADA Enrichi
    # Structure : (Code, Libellé, Classe, Catégorie pour l'IA)
    ohada_structure = [
        # CLASSE 1 : CAPITAUX
        ('101100', 'Capital souscrit, non appelé', '1'),
        ('131100', 'Subventions d\'équipement', '1'),

        # CLASSE 4 : TIERS (Crucial pour le Dashboard)
        ('401100', 'Fournisseurs d\'exploitation', '4'),
        ('411100', 'Clients', '4'),
        ('422000', 'Personnel, Rémunérations dues', '4'),
        ('442100', 'État, Impôts sur bénéfices', '4'),
        ('445100', 'TVA récupérable sur immobilisations', '4'),
        ('445200', 'TVA récupérable sur achats', '4'),
        ('445300', 'TVA facturée sur ventes', '4'),

        # CLASSE 5 : TRÉSORERIE (Multi-Devises ready)
        ('521100', 'Banques locales XOF', '5'),
        ('521200', 'Banques Nigeria NGN', '5'),
        ('521300', 'Banques Ghana GHS', '5'),
        ('571100', 'Caisse Siège', '5'),

        # CLASSE 6 : CHARGES (Analyse de rentabilité)
        ('601100', 'Achats de marchandises', '6'),
        ('611000', 'Transports', '6'),
        ('622100', 'Honoraires', '6'),
        ('632400', 'Publicité, publications', '6'),
        ('641100', 'Salaires et appointements', '6'),
        ('661100', 'Charges d\'intérêts', '6'),

        # CLASSE 7 : PRODUITS
        ('701100', 'Ventes de marchandises', '7'),
        ('706100', 'Prestations de services', '7'),
        ('754000', 'Produits divers ordinaires', '7'),
    ]

    for code, label, acc_class in ohada_structure:
        Account.objects.update_or_create(
            code=code,
            organization=org,
            defaults={
                'label': label, 
                'account_class': acc_class,
                # On peut ajouter ici des métadonnées pour l'IA si ton modèle le permet
                # 'description': f"Compte standard OHADA pour {label}"
            }
        )

    print(f"📚 {len(ohada_structure)} comptes OHADA configurés pour {org.name}.")
    print("✨ Système prêt pour les tests de flux !")

if __name__ == '__main__':
    run_seed()