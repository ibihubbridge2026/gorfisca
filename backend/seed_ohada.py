# backend/seed_ohada.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import Organization
from apps.users.models import User
from apps.accounting.models import Account

def run_seed():
    print("🌱 Démarrage du seed Gorfisca...")

    # 1. Création de l'Organisation de test
    org, created = Organization.objects.get_or_create(
        name="Ma PME Gorfisca"
    )
    if created:
        print(f"✅ Organisation créée : {org.name}")

    # 2. Liaison de l'admin à l'organisation
    admin = User.objects.filter(username='admin').first()
    if admin:
        admin.organization = org
        admin.save()
        print(f"🔗 Admin lié à l'organisation {org.name}")

    # 3. Injection simplifiée du Plan Comptable OHADA
    ohada_accounts = [
        # Classe 1 : Capitaux
        ('101000', 'Capital social', '1'),
        # Classe 4 : Tiers
        ('401100', 'Fournisseurs', '4'),
        ('411100', 'Clients', '4'),
        ('445000', 'TVA État', '4'),
        # Classe 5 : Trésorerie
        ('521000', 'Banque (XOF)', '5'),
        ('571000', 'Caisse', '5'),
        # Classe 6 : Charges
        ('601100', 'Achats de marchandises', '6'),
        ('620000', 'Services extérieurs', '6'),
        # Classe 7 : Produits
        ('701100', 'Ventes de marchandises', '7'),
    ]

    for code, label, acc_class in ohada_accounts:
        Account.objects.get_or_create(
            code=code,
            organization=org,
            defaults={'label': label, 'account_class': acc_class}
        )
    
    print(f"📚 {len(ohada_accounts)} comptes OHADA injectés.")
    print("✨ Seed terminé avec succès !")

if __name__ == '__main__':
    run_seed()