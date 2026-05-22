from decimal import Decimal, ROUND_HALF_UP, ROUND_HALF_DOWN, ROUND_UP, ROUND_DOWN
from django.utils import timezone
from django.db import transaction
from .models import Currency, ExchangeRate, CurrencyConfiguration, CurrencyTransaction, CurrencyBalance


class CurrencyService:
    """
    Service pour la gestion des devises et conversions
    """
    
    @classmethod
    def convert_amount(cls, amount, from_currency, to_currency, date=None):
        """
        Convertir un montant d'une devise à une autre
        
        Args:
            amount: Montant à convertir
            from_currency: Devise source (instance Currency)
            to_currency: Devise cible (instance Currency)
            date: Date du taux de change (optionnel)
            
        Returns:
            Tuple (montant_converti, taux_utilisé, date_taux)
        """
        if amount is None or amount == 0:
            return Decimal('0.00'), Decimal('1.00'), timezone.now().date()
        
        # Si même devise, pas de conversion
        if from_currency == to_currency:
            return amount, Decimal('1.00'), timezone.now().date()
        
        # Obtenir le taux de change
        exchange_rate = ExchangeRate.get_rate(from_currency, to_currency, date)
        
        if not exchange_rate:
            raise ValueError(f"Aucun taux de change trouvé pour {from_currency.code} → {to_currency.code} à la date {date or 'aujourd'hui'}")
        
        # Convertir le montant
        converted_amount = exchange_rate.convert_amount(amount)
        
        return converted_amount, exchange_rate.rate, exchange_rate.date
    
    @classmethod
    def get_latest_rate(cls, from_currency, to_currency):
        """
        Obtenir le taux de change le plus récent
        """
        return ExchangeRate.get_latest_rate(from_currency, to_currency)
    
    @classmethod
    def update_exchange_rate(cls, from_currency, to_currency, rate, date=None, source='manual'):
        """
        Mettre à jour ou créer un taux de change
        """
        if date is None:
            date = timezone.now().date()
        
        # Valider le taux
        if rate <= 0:
            raise ValueError("Le taux de change doit être positif")
        
        # Créer ou mettre à jour le taux
        exchange_rate, created = ExchangeRate.objects.update_or_create(
            from_currency=from_currency,
            to_currency=to_currency,
            date=date,
            defaults={
                'rate': rate,
                'source': source,
                'is_active': True
            }
        )
        
        if not created:
            exchange_rate.rate = rate
            exchange_rate.source = source
            exchange_rate.is_active = True
            exchange_rate.save()
        
        return exchange_rate
    
    @classmethod
    def get_currency_balance(cls, organization, currency):
        """
        Obtenir le solde d'une organisation dans une devise
        """
        return CurrencyBalance.get_or_create_balance(organization, currency)
    
    @classmethod
    def update_balance(cls, organization, currency, amount_change, transaction_type='other', 
                      content_object=None, description=''):
        """
        Mettre à jour le solde d'une organisation
        """
        with transaction.atomic():
            # Obtenir la configuration de devises
            config = CurrencyConfiguration.get_for_organization(organization)
            
            # Obtenir le solde existant
            balance = cls.get_currency_balance(organization, currency)
            
            # Si la devise n'est pas la devise de base, convertir
            if currency != config.base_currency:
                converted_amount, exchange_rate, rate_date = cls.convert_amount(
                    amount_change, currency, config.base_currency
                )
            else:
                converted_amount = amount_change
                exchange_rate = Decimal('1.00')
                rate_date = timezone.now().date()
            
            # Mettre à jour le solde
            balance.update_balance(amount_change, converted_amount)
            
            # Créer la transaction
            CurrencyTransaction.create_transaction(
                organization=organization,
                transaction_type=transaction_type,
                original_currency=currency,
                original_amount=amount_change,
                base_currency=config.base_currency,
                base_amount=converted_amount,
                exchange_rate=exchange_rate,
                rate_date=rate_date,
                content_object=content_object,
                description=description
            )
            
            return balance
    
    @classmethod
    def get_total_balance(cls, organization, target_currency=None):
        """
        Obtenir le solde total d'une organisation dans une devise cible
        """
        config = CurrencyConfiguration.get_for_organization(organization)
        
        if target_currency is None:
            target_currency = config.base_currency
        
        total_balance = Decimal('0.00')
        balances = CurrencyBalance.objects.filter(organization=organization)
        
        for balance in balances:
            if balance.currency == target_currency:
                total_balance += balance.base_currency_equivalent
            else:
                converted_amount, _, _ = cls.convert_amount(
                    balance.base_currency_equivalent, 
                    config.base_currency, 
                    target_currency
                )
                total_balance += converted_amount
        
        return total_balance
    
    @classmethod
    def validate_currency_configuration(cls, organization):
        """
        Valider la configuration des devises d'une organisation
        """
        config = CurrencyConfiguration.get_for_organization(organization)
        errors = []
        
        # Vérifier que la devise de base est active
        if not config.base_currency.is_active:
            errors.append(f"La devise de base {config.base_currency.code} n'est pas active")
        
        # Vérifier que la devise de reporting est active
        if not config.reporting_currency.is_active:
            errors.append(f"La devise de reporting {config.reporting_currency.code} n'est pas active")
        
        # Vérifier qu'il y a des taux de change récents
        if config.base_currency != config.reporting_currency:
            latest_rate = cls.get_latest_rate(config.base_currency, config.reporting_currency)
            if not latest_rate:
                errors.append(f"Aucun taux de change trouvé entre {config.base_currency.code} et {config.reporting_currency.code}")
            else:
                days_old = (timezone.now().date() - latest_rate.date).days
                if days_old > config.max_rate_age_days:
                    errors.append(f"Le taux de change est trop ancien ({days_old} jours)")
        
        # Vérifier les devises autorisées
        allowed_currencies = config.get_allowed_currencies()
        for currency in allowed_currencies:
            if not currency.is_active:
                errors.append(f"La devise autorisée {currency.code} n'est pas active")
        
        return errors
    
    @classmethod
    def get_exchange_rate_history(cls, from_currency, to_currency, days=30):
        """
        Obtenir l'historique des taux de change
        """
        from django.utils import timezone
        
        start_date = timezone.now().date() - timezone.timedelta(days=days)
        
        return ExchangeRate.objects.filter(
            from_currency=from_currency,
            to_currency=to_currency,
            date__gte=start_date,
            is_active=True
        ).order_by('date')
    
    @classmethod
    def batch_update_rates(cls, rates_data, source='batch'):
        """
        Mettre à jour plusieurs taux de change en lot
        """
        updated_rates = []
        
        with transaction.atomic():
            for rate_data in rates_data:
                try:
                    from_currency = Currency.objects.get(code=rate_data['from_currency'])
                    to_currency = Currency.objects.get(code=rate_data['to_currency'])
                    rate = Decimal(str(rate_data['rate']))
                    date = rate_data.get('date', timezone.now().date())
                    
                    exchange_rate = cls.update_exchange_rate(
                        from_currency, to_currency, rate, date, source
                    )
                    updated_rates.append(exchange_rate)
                    
                except (Currency.DoesNotExist, KeyError, ValueError) as e:
                    continue
        
        return updated_rates
    
    @classmethod
    def calculate_gains_losses(cls, organization, start_date=None, end_date=None):
        """
        Calculer les gains/pertes de change pour une organisation
        """
        if start_date is None:
            start_date = timezone.now().date() - timezone.timedelta(days=30)
        if end_date is None:
            end_date = timezone.now().date()
        
        config = CurrencyConfiguration.get_for_organization(organization)
        
        # Récupérer les transactions de la période
        transactions = CurrencyTransaction.objects.filter(
            organization=organization,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).exclude(
            original_currency=config.base_currency
        )
        
        total_gains = Decimal('0.00')
        total_losses = Decimal('0.00')
        
        for transaction in transactions:
            # Calculer la différence si on utilisait le taux actuel
            current_rate = cls.get_latest_rate(
                transaction.original_currency, 
                config.base_currency
            )
            
            if current_rate and current_rate.date != transaction.rate_date:
                current_amount = transaction.original_amount * current_rate.rate
                difference = current_amount - transaction.base_amount
                
                if difference > 0:
                    total_gains += difference
                else:
                    total_losses += abs(difference)
        
        return {
            'total_gains': total_gains,
            'total_losses': total_losses,
            'net_result': total_gains - total_losses,
            'period': f"{start_date} à {end_date}"
        }


class CurrencyFormatter:
    """
    Utilitaire pour formater les montants selon les devises
    """
    
    @classmethod
    def format_amount(cls, amount, currency, include_symbol=True, decimal_places=None):
        """
        Formater un montant selon la devise
        """
        if amount is None:
            return '0.00'
        
        if decimal_places is None:
            decimal_places = currency.decimal_places
        
        # Formatter le nombre
        formatted_number = f"{amount:,.{decimal_places}f}".replace(',', ' ')
        
        if include_symbol:
            return f"{formatted_number} {currency.symbol}"
        else:
            return formatted_number
    
    @classmethod
    def format_for_display(cls, amount, organization):
        """
        Formater un montant pour l'affichage selon la configuration de l'organisation
        """
        config = CurrencyConfiguration.get_for_organization(organization)
        return cls.format_amount(amount, config.reporting_currency)
    
    @classmethod
    def parse_amount(cls, amount_str, currency):
        """
        Parser une chaîne de caractères en montant selon la devise
        """
        if not amount_str:
            return Decimal('0.00')
        
        # Nettoyer la chaîne
        cleaned = amount_str.replace(' ', '').replace(currency.symbol, '').strip()
        
        try:
            return Decimal(cleaned)
        except ValueError:
            raise ValueError(f"Montant invalide: {amount_str}")


class CurrencyValidator:
    """
    Validations pour les opérations multi-devises
    """
    
    @classmethod
    def validate_amount(cls, amount, currency):
        """
        Valider un montant selon la devise
        """
        if amount is None:
            raise ValueError("Le montant ne peut pas être nul")
        
        if amount < 0:
            raise ValueError("Le montant ne peut pas être négatif")
        
        # Vérifier la précision maximale
        max_precision = currency.decimal_places + 2
        if abs(amount.as_tuple().exponent) > max_precision:
            raise ValueError(f"La précision du montant dépasse {max_precision} décimales")
    
    @classmethod
    def validate_currency_pair(cls, from_currency, to_currency):
        """
        Valider une paire de devises
        """
        if from_currency == to_currency:
            raise ValueError("Les devises doivent être différentes")
        
        if not from_currency.is_active or not to_currency.is_active:
            raise ValueError("Les devises doivent être actives")
    
    @classmethod
    def validate_exchange_rate(cls, rate):
        """
        Valider un taux de change
        """
        if rate is None:
            raise ValueError("Le taux ne peut pas être nul")
        
        if rate <= 0:
            raise ValueError("Le taux doit être positif")
        
        # Vérifier la précision
        if abs(rate.as_tuple().exponent) > 10:
            raise ValueError("La précision du taux est trop élevée")
    
    @classmethod
    def validate_transaction_amount(cls, amount, organization, currency):
        """
        Valider un montant de transaction pour une organisation
        """
        cls.validate_amount(amount, currency)
        
        config = CurrencyConfiguration.get_for_organization(organization)
        
        if not config.is_currency_allowed(currency):
            raise ValueError(f"La devise {currency.code} n'est pas autorisée pour cette organisation")
