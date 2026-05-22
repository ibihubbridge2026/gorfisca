"""
Tests unitaires pour GORFISCA - Plateforme Comptable OHADA
"""
import pytest
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def organization(db):
    """Fixture: Crée une organisation de test"""
    from apps.organizations.models import Organization
    return Organization.objects.create(
        name="Entreprise Test SARL",
        legal_identifier="NIF-TEST-2024-001",
        status='active'
    )


@pytest.fixture
def admin_user(db, organization):
    """Fixture: Crée un utilisateur admin"""
    return User.objects.create_user(
        email='admin@test.com',
        username='admin',
        password='SecurePass123!',
        first_name='Admin',
        last_name='Test',
        role='admin',
        organization=organization
    )


@pytest.fixture
def accountant_user(db, organization):
    """Fixture: Crée un utilisateur comptable"""
    return User.objects.create_user(
        email='comptable@test.com',
        username='comptable',
        password='SecurePass123!',
        first_name='Comptable',
        last_name='Test',
        role='accountant',
        organization=organization
    )


@pytest.fixture
def viewer_user(db, organization):
    """Fixture: Crée un utilisateur lecteur"""
    return User.objects.create_user(
        email='lecteur@test.com',
        username='lecteur',
        password='SecurePass123!',
        first_name='Lecteur',
        last_name='Test',
        role='viewer',
        organization=organization
    )


class TestOrganizationModel:
    """Tests pour le modèle Organization"""
    
    def test_organization_creation(self, db):
        """Test: Création basique d'une organisation"""
        from apps.organizations.models import Organization
        
        org = Organization.objects.create(
            name="Test Org",
            legal_identifier="TEST-001"
        )
        
        assert org.name == "Test Org"
        assert org.legal_identifier == "TEST-001"
        assert org.status == 'active'
        assert org.is_active() is True
    
    def test_organization_str(self, organization):
        """Test: Représentation string d'une organisation"""
        expected = f"{organization.name} ({organization.legal_identifier})"
        assert str(organization) == expected
    
    def test_organization_active_users_count(self, organization, admin_user, accountant_user):
        """Test: Comptage des utilisateurs actifs"""
        assert organization.active_users_count == 2


class TestUserModel:
    """Tests pour le modèle User"""
    
    def test_user_creation(self, db, organization):
        """Test: Création basique d'un utilisateur"""
        user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='pass123',
            first_name='Test',
            last_name='User',
            organization=organization
        )
        
        assert user.email == 'test@example.com'
        assert user.role == 'viewer'  # default role
        assert user.organization == organization
        assert user.is_active is True
    
    def test_user_is_organization_admin(self, admin_user, accountant_user):
        """Test: Vérification du statut admin"""
        assert admin_user.is_organization_admin() is True
        assert accountant_user.is_organization_admin() is False
    
    def test_user_full_name(self, admin_user):
        """Test: Nom complet de l'utilisateur"""
        assert admin_user.full_name == "Admin Test"


class TestAuthentication:
    """Tests pour l'authentification et les permissions"""
    
    @pytest.mark.django_db
    def test_user_login(self, client, admin_user):
        """Test: Connexion d'un utilisateur"""
        response = client.post('/api/v1/auth/login/', {
            'email': 'admin@test.com',
            'password': 'SecurePass123!'
        })
        
        assert response.status_code == 200
        assert 'token' in response.data
        assert response.data['user']['email'] == 'admin@test.com'
    
    @pytest.mark.django_db
    def test_user_registration_creates_organization(self, client):
        """Test: L'inscription crée automatiquement une organisation"""
        response = client.post('/api/v1/auth/register/', {
            'email': 'newuser@test.com',
            'username': 'newuser',
            'password': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User'
        })
        
        assert response.status_code == 201
        assert 'organization' in response.data
        assert response.data['needs_onboarding'] is True
    
    @pytest.mark.django_db
    def test_unauthenticated_access_denied(self, client):
        """Test: Accès non authentifié refusé"""
        response = client.get('/api/v1/accounting/accounts/')
        assert response.status_code == 401


class TestAccountingModels:
    """Tests pour les modèles comptables"""
    
    @pytest.mark.django_db
    def test_account_creation(self, organization):
        """Test: Création d'un compte comptable"""
        from apps.accounting.models import Account
        
        account = Account.objects.create(
            code='411100',
            label='Clients',
            account_class='4',
            organization=organization
        )
        
        assert account.code == '411100'
        assert account.account_class == '4'
        assert account.organization == organization
    
    @pytest.mark.django_db
    def test_journal_entry_balance_validation(self, organization, admin_user):
        """Test: Validation de l'équilibre d'une écriture"""
        from apps.accounting.models import JournalEntry, JournalLine, Account
        
        # Créer des comptes
        debit_account = Account.objects.create(
            code='611000',
            label='Transports',
            account_class='6',
            organization=organization
        )
        credit_account = Account.objects.create(
            code='521100',
            label='Banque',
            account_class='5',
            organization=organization
        )
        
        # Créer une écriture équilibrée
        entry = JournalEntry.objects.create(
            reference='TEST-001',
            description='Test écriture',
            date=date.today(),
            organization=organization,
            created_by=admin_user
        )
        
        JournalLine.objects.create(
            entry=entry,
            account=debit_account,
            line_type='debit',
            amount=Decimal('10000.00')
        )
        JournalLine.objects.create(
            entry=entry,
            account=credit_account,
            line_type='credit',
            amount=Decimal('10000.00')
        )
        
        assert entry.is_balanced is True
    
    @pytest.mark.django_db
    def test_journal_entry_imbalance_detection(self, organization, admin_user):
        """Test: Détection du déséquilibre d'une écriture"""
        from apps.accounting.models import JournalEntry, JournalLine, Account
        
        debit_account = Account.objects.create(
            code='611000',
            label='Transports',
            account_class='6',
            organization=organization
        )
        credit_account = Account.objects.create(
            code='521100',
            label='Banque',
            account_class='5',
            organization=organization
        )
        
        entry = JournalEntry.objects.create(
            reference='TEST-002',
            description='Test déséquilibré',
            date=date.today(),
            organization=organization,
            created_by=admin_user
        )
        
        JournalLine.objects.create(
            entry=entry,
            account=debit_account,
            line_type='debit',
            amount=Decimal('10000.00')
        )
        JournalLine.objects.create(
            entry=entry,
            account=credit_account,
            line_type='credit',
            amount=Decimal('9000.00')  # Montant différent
        )
        
        assert entry.is_balanced is False


class TestReconciliationService:
    """Tests pour le service de rapprochement bancaire"""
    
    @pytest.mark.django_db
    def test_csv_parser_valid_file(self, organization, admin_user):
        """Test: Parsing d'un fichier CSV valide"""
        from apps.reconciliation.services import TransactionParserService
        import io
        
        csv_content = io.StringIO("Date,Description,Amount,Reference\n2024-01-15,Paiement client,50000.00,REF001")
        csv_file = io.BytesIO(csv_content.getvalue().encode('utf-8'))
        csv_file.name = 'test.csv'
        
        batch = TransactionParserService.parse_csv_file(
            csv_file,
            organization,
            admin_user
        )
        
        assert batch.imported_rows == 1
        assert batch.status == 'completed'
    
    @pytest.mark.django_db
    def test_matching_service_finds_matches(self, organization, admin_user):
        """Test: Service de matching trouve des correspondances"""
        from apps.reconciliation.models import BankTransaction
        from apps.reconciliation.services import MatchingService
        from apps.accounting.models import JournalEntry, JournalLine, Account
        
        # Créer une transaction bancaire
        bank_txn = BankTransaction.objects.create(
            organization=organization,
            date=date.today(),
            description='Paiement client',
            amount=Decimal('50000.00'),
            transaction_type='credit',
            reference='BNK-001'
        )
        
        # Créer une écriture correspondante
        account = Account.objects.create(
            code='411100',
            label='Clients',
            account_class='4',
            organization=organization
        )
        
        entry = JournalEntry.objects.create(
            reference='INV-001',
            description='Facture client',
            date=date.today(),
            organization=organization,
            created_by=admin_user,
            posted=True,
            is_validated=True
        )
        
        journal_line = JournalLine.objects.create(
            entry=entry,
            account=account,
            line_type='credit',
            amount=Decimal('50000.00'),
            reconciled=False
        )
        
        matches = MatchingService.find_matches_for_transaction(bank_txn)
        
        assert len(matches) > 0
        assert matches[0][0] == journal_line
        assert matches[0][1] >= 80  # High confidence score


class TestPermissions:
    """Tests pour les permissions"""
    
    @pytest.mark.django_db
    def test_viewer_cannot_import_files(self, client, viewer_user, organization):
        """Test: Un lecteur ne peut pas importer de fichiers"""
        from rest_framework.authtoken.models import Token
        
        token = Token.objects.create(user=viewer_user)
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        # Tentative d'import
        response = client.post('/api/v1/reconciliation/bulk_import/', {})
        
        assert response.status_code == 403
    
    @pytest.mark.django_db
    def test_accountant_can_import_files(self, client, accountant_user, organization):
        """Test: Un comptable peut importer des fichiers"""
        from rest_framework.authtoken.models import Token
        import io
        
        token = Token.objects.create(user=accountant_user)
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        # Créer un faux fichier CSV
        csv_content = b"Date,Description,Amount,Reference\n2024-01-15,Test,1000.00,REF001"
        
        response = client.post(
            '/api/v1/reconciliation/bulk_import/',
            {'file': io.BytesIO(csv_content)},
            format='multipart'
        )
        
        # Devrait réussir (201) ou échouer sur validation de fichier (400), mais pas 403
        assert response.status_code != 403


class TestIntegrityService:
    """Tests pour le service d'intégrité financière"""
    
    @pytest.mark.django_db
    def test_global_balance_verification(self, organization, admin_user):
        """Test: Vérification de l'équilibre global"""
        from apps.reporting.services.integrity_service import IntegrityService
        from apps.accounting.models import JournalEntry, JournalLine, Account
        
        # Créer des comptes
        debit_account = Account.objects.create(
            code='611000',
            label='Transports',
            account_class='6',
            organization=organization
        )
        credit_account = Account.objects.create(
            code='521100',
            label='Banque',
            account_class='5',
            organization=organization
        )
        
        # Créer une écriture équilibrée
        entry = JournalEntry.objects.create(
            reference='TEST-BAL-001',
            description='Test équilibre',
            date=date.today(),
            organization=organization,
            created_by=admin_user,
            posted=True,
            is_validated=True
        )
        
        JournalLine.objects.create(
            entry=entry,
            account=debit_account,
            line_type='debit',
            amount=Decimal('25000.00')
        )
        JournalLine.objects.create(
            entry=entry,
            account=credit_account,
            line_type='credit',
            amount=Decimal('25000.00')
        )
        
        integrity_service = IntegrityService()
        result = integrity_service.verify_global_balance(organization.id)
        
        assert result['is_balanced'] is True
        assert result['total_debit'] == 25000.0
        assert result['total_credit'] == 25000.0


# Tests pour le onboarding
class TestOnboarding:
    """Tests pour le processus d'onboarding"""
    
    @pytest.mark.django_db
    def test_new_user_needs_onboarding(self, client):
        """Test: Nouvel utilisateur doit compléter l'onboarding"""
        response = client.post('/api/v1/auth/register/', {
            'email': 'founder@startup.com',
            'username': 'founder',
            'password': 'SecurePass123!',
            'first_name': 'Founder',
            'last_name': 'Startup'
        })
        
        assert response.status_code == 201
        assert response.data['needs_onboarding'] is True
        assert response.data['organization']['legal_identifier'].startswith('PENDING-')
    
    @pytest.mark.django_db
    def test_invitation_flow(self, client, organization, admin_user):
        """Test: Flux d'invitation d'utilisateurs"""
        from apps.organizations.models import OrganizationInvitation
        from rest_framework.authtoken.models import Token
        
        # Admin crée une invitation
        token = Token.objects.create(user=admin_user)
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        response = client.post('/api/v1/organizations/invitations/', {
            'email': 'invitee@test.com',
            'role': 'accountant'
        })
        
        assert response.status_code == 201
        assert 'token' in response.data
        
        invitation_token = response.data['token']
        
        # L'invité s'inscrit avec le token
        client.logout()
        response = client.post('/api/v1/auth/register/', {
            'email': 'invitee@test.com',
            'username': 'invitee',
            'password': 'SecurePass123!',
            'first_name': 'Invitee',
            'last_name': 'User',
            'invitation_token': invitation_token
        })
        
        assert response.status_code == 201
        assert response.data['organization']['id'] == organization.id
        assert response.data['user']['role'] == 'accountant'
