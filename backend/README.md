# Gorfisca Backend

Backend Django pour la plateforme SaaS de comptabilité OHADA.

## Structure

```
backend/
├── config/                 # Configuration Django
│   ├── settings.py        # Paramètres principaux
│   ├── urls.py           # URLs principales
│   └── wsgi.py           # WSGI application
├── apps/                  # Applications Django
│   ├── users/            # Gestion des utilisateurs
│   ├── organizations/    # Multi-tenancy
│   └── accounting/       # Cœur comptable OHADA
├── requirements/          # Dépendances Python
│   ├── base.txt         # Dépendances de base
│   └── dev.txt          # Dépendances de développement
├── Dockerfile            # Configuration Docker
└── manage.py            # Script de gestion Django
```

## Démarrage rapide

1. Copier le fichier `.env.example` vers `.env`:
   ```bash
   cp .env.example .env
   ```

2. Lancer les services avec Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Créer les tables de la base de données:
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

4. Créer un superutilisateur:
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

## Modèles principaux

### Users (Utilisateurs)
- `User`: Modèle utilisateur personnalisé avec rôles et multi-tenancy

### Organizations (Organisations)
- `Organization`: Modèle pour la gestion multi-tenant

### Accounting (Comptabilité)
- `Account`: Plan comptable OHADA
- `JournalEntry`: Écritures comptables
- `JournalLine`: Lignes d'écritures (double entrée)

## Services comptables

Le module `accounting.services` contient la logique métier:
- Validation de la double entrée (débit = crédit)
- Création d'écritures comptables
- Calcul des balances
- Validation des périodes fiscales

## Conformité OHADA

Le système respecte les principes:
- **Immuabilité**: Les écritures validées ne peuvent être modifiées
- **Double entrée**: Chaque écriture est équilibrée
- **Plan comptable**: Conforme au référentiel OHADA
- **Multi-tenancy**: Isolation complète des données par organisation
