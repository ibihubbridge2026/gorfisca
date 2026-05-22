from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Currency

User = get_user_model()


@receiver(post_migrate)
def create_default_currencies(sender, **kwargs):
    """
    Créer les devises par défaut après la migration
    """
    if sender.name == 'apps.currencies':
        default_currencies = [
            # Devises existantes
            {
                'code': 'XOF',
                'name': 'Franc CFA BCEAO',
                'symbol': 'FCFA',
                'decimal_places': 0,
                'country': 'BCEAO',
                'is_default': True,
                'description': 'Franc CFA West African States, utilisé dans 8 pays d\'Afrique de l\'Ouest'
            },
            {
                'code': 'EUR',
                'name': 'Euro',
                'symbol': '€',
                'decimal_places': 2,
                'country': 'Eurozone',
                'description': 'Monnaie officielle de 19 pays de l\'Union Européenne'
            },
            {
                'code': 'USD',
                'name': 'Dollar américain',
                'symbol': '$',
                'decimal_places': 2,
                'country': 'États-Unis',
                'description': 'Monnaie de réserve mondiale principale'
            },
            {
                'code': 'GBP',
                'name': 'Livre sterling',
                'symbol': '£',
                'decimal_places': 2,
                'country': 'Royaume-Uni',
                'description': 'Monnaie du Royaume-Uni'
            },
            # Nouvelles devises ajoutées pour GORFISCA v2.0
            {
                'code': 'NGN',
                'name': 'Naira nigérian',
                'symbol': '₦',
                'decimal_places': 2,
                'country': 'Nigeria',
                'description': 'Monnaie officielle du Nigéria, plus grande économie d\'Afrique'
            },
            {
                'code': 'GHS',
                'name': 'Cedi ghanéen',
                'symbol': 'GH₵',
                'decimal_places': 2,
                'country': 'Ghana',
                'description': 'Monnaie officielle du Ghana'
            },
            {
                'code': 'ZAR',
                'name': 'Rand sud-africain',
                'symbol': 'R',
                'decimal_places': 2,
                'country': 'Afrique du Sud',
                'description': 'Monnaie officielle d\'Afrique du Sud et pays membres de la Zone Monétaire Commune'
            },
            {
                'code': 'XAF',
                'name': 'Franc CFA BEAC',
                'symbol': 'FCFA',
                'decimal_places': 0,
                'country': 'BEAC',
                'description': 'Franc CFA Central African States, utilisé dans 6 pays d\'Afrique Centrale'
            },
            {
                'code': 'MAD',
                'name': 'Dirham marocain',
                'symbol': 'DH',
                'decimal_places': 2,
                'country': 'Maroc',
                'description': 'Monnaie officielle du Maroc'
            },
            {
                'code': 'TND',
                'name': 'Dinar tunisien',
                'symbol': 'DT',
                'decimal_places': 3,
                'country': 'Tunisie',
                'description': 'Monnaie officielle de la Tunisie'
            },
            {
                'code': 'EGP',
                'name': 'Livre égyptienne',
                'symbol': 'E£',
                'decimal_places': 2,
                'country': 'Égypte',
                'description': 'Monnaie officielle de l\'Égypte'
            },
            {
                'code': 'KES',
                'name': 'Shilling kényan',
                'symbol': 'KSh',
                'decimal_places': 2,
                'country': 'Kenya',
                'description': 'Monnaie officielle du Kenya'
            },
            {
                'code': 'UGX',
                'name': 'Shilling ougandais',
                'symbol': 'USh',
                'decimal_places': 0,
                'country': 'Ouganda',
                'description': 'Monnaie officielle de l\'Ouganda'
            },
            {
                'code': 'TZS',
                'name': 'Shilling tanzanien',
                'symbol': 'TSh',
                'decimal_places': 0,
                'country': 'Tanzanie',
                'description': 'Monnaie officielle de la Tanzanie'
            },
            {
                'code': 'RWF',
                'name': 'Franc rwandais',
                'symbol': 'RWF',
                'decimal_places': 0,
                'country': 'Rwanda',
                'description': 'Monnaie officielle du Rwanda'
            },
            {
                'code': 'BIF',
                'name': 'Franc burundais',
                'symbol': 'FBu',
                'decimal_places': 0,
                'country': 'Burundi',
                'description': 'Monnaie officielle du Burundi'
            },
            {
                'code': 'CDF',
                'name': 'Franc congolais',
                'symbol': 'FC',
                'decimal_places': 2,
                'country': 'République Démocratique du Congo',
                'description': 'Monnaie officielle de la RDC'
            },
            {
                'code': 'SCR',
                'name': 'Roupie des Seychelles',
                'symbol': 'SR',
                'decimal_places': 2,
                'country': 'Seychelles',
                'description': 'Monnaie officielle des Seychelles'
            },
            {
                'code': 'MUR',
                'name': 'Roupie mauricienne',
                'symbol': 'Rs',
                'decimal_places': 2,
                'country': 'Maurice',
                'description': 'Monnaie officielle de Maurice'
            },
        ]

        for currency_data in default_currencies:
            currency, created = Currency.objects.get_or_create(
                code=currency_data['code'],
                defaults=currency_data
            )
            if created:
                print(f"✅ Devise créée: {currency.code} - {currency.name}")
            else:
                print(f"ℹ️  Devise existante: {currency.code} - {currency.name}")

        print(f"🌱 {len(default_currencies)} devises configurées pour GORFISCA v2.0")
