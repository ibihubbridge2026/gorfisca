# GORFISCA — Architecture et Vision Complète du Projet

## Vision du système

Gorfisca est une plateforme SaaS de comptabilité intelligente conforme OHADA.

Son objectif est de :
- automatiser la comptabilité,
- sécuriser les données financières,
- simplifier les déclarations fiscales,
- aider les PME africaines à gérer leurs finances sans expertise comptable avancée.

---

# Le rôle de Gorfisca

Une entreprise génère constamment :
- des paiements,
- des factures,
- des taxes,
- des opérations bancaires,
- des obligations fiscales.

Sans système structuré :
- les erreurs deviennent fréquentes,
- les chiffres deviennent incohérents,
- les déclarations fiscales deviennent compliquées.

Gorfisca agit comme :

> un système nerveux financier intelligent pour les PME africaines.

---

# Les 5 piliers fondamentaux

---

# 1. Immutabilité — Le registre comptable sécurisé

En comptabilité professionnelle :
- une écriture validée ne doit jamais être modifiée,
- toute correction doit passer par une contre-écriture.

## Fonctionnement

Chaque écriture possède :
- un identifiant unique,
- un timestamp,
- un hash cryptographique.

Le hash agit comme une empreinte digitale.

Si une ancienne écriture est modifiée :
- le hash change,
- la chaîne de confiance devient invalide,
- la fraude devient détectable.

## Avantages

- sécurité comptable,
- conformité fiscale,
- traçabilité,
- auditabilité,
- confiance bancaire.

---

# 2. Assistant IA — L’automatisation comptable

La comptabilité classique est :
- répétitive,
- lente,
- sujette aux erreurs humaines.

## Fonctionnement IA

L’utilisateur peut importer :
- une facture,
- un PDF,
- une image,
- un relevé bancaire.

L’IA :
- lit le document,
- extrait les données importantes,
- détecte :
  - montants,
  - TVA,
  - fournisseur,
  - date,
  - catégorie comptable.

Puis :
- propose automatiquement une écriture comptable.

## Exemple

Facture :

```text
MTN INTERNET - 25 000 FCFA
```

Suggestion IA :

```text
Débit 626 Télécommunications
Débit TVA
Crédit Banque
```

L’utilisateur valide ensuite l’opération.

---

# 3. Précision Financière — Decimal Only

Les calculs financiers ne doivent jamais utiliser de nombres flottants (`float`).

Exemple problématique :

```text
0.1 + 0.2 = 0.30000000004
```

Dans une application financière :
- cette erreur est inacceptable.

## Solution

Gorfisca utilise exclusivement :

```python
Decimal
```

## Garanties

- précision exacte,
- TVA fiable,
- bilans cohérents,
- conformité comptable.

---

# 4. Fiscal Engine — Le moteur fiscal OHADA

Les règles fiscales changent selon les pays :
- Bénin,
- Sénégal,
- Côte d’Ivoire,
- Togo,
- Cameroun,
etc.

## Fonctionnement

Le moteur fiscal contient :
- les taux TVA,
- les règles fiscales,
- les formulaires,
- les obligations déclaratives.

## Exemple

### Bénin

```text
TVA = 18%
```

Le système :
- calcule automatiquement la TVA,
- prépare les états fiscaux,
- génère les déclarations.

---

# 5. Permissions & Sécurité

Chaque utilisateur possède des permissions spécifiques.

## Exemples de rôles

| Rôle | Permissions |
|---|---|
| Patron | accès total |
| Comptable | gestion comptable |
| Employé | accès limité |
| Auditeur | lecture seule |

## Sanctuary Mode

L’auditeur peut :
- consulter,
- analyser,
- exporter.

Mais :
- il ne peut rien modifier.

---

# Workflow d’une opération financière

## Étape 1 — Réception d’une transaction

Exemples :
- Mobile Money,
- virement bancaire,
- paiement client,
- dépense.

---

## Étape 2 — Réconciliation

Le système rapproche :
- transactions bancaires,
- factures,
- paiements.

---

## Étape 3 — Écriture comptable

Le moteur comptable crée :
- débit,
- crédit.

Toujours équilibré.

---

## Étape 4 — Sécurisation

Le système génère :
- hash,
- audit trail,
- historique.

---

## Étape 5 — Reporting

Le système génère :
- bilan,
- compte de résultat,
- balance,
- rapports OHADA,
- états fiscaux.

---

# Pourquoi Gorfisca est Finance-Grade

## 1. JWT Authentication

Les sessions :
- expirent automatiquement,
- utilisent des tokens sécurisés,
- empêchent le vol de session.

---

## 2. Audit Trail

Toutes les actions sont enregistrées :
- qui,
- quand,
- quoi,
- avant/après.

---

## 3. Multi-tenant sécurisé

Chaque entreprise est isolée.

Aucune organisation ne peut accéder :
- aux données d’une autre entreprise.

---

## 4. Multi-devise

Support :
- FCFA,
- USD,
- EUR,
- autres devises.

Avec :
- historique des taux,
- conversions fiables.

---

# Architecture du système

| Moteur | Rôle |
|---|---|
| Ledger Engine | comptabilité |
| Fiscal Engine | fiscalité OHADA |
| AI Engine | automatisation |
| Reconciliation Engine | rapprochement bancaire |
| Audit Engine | traçabilité |
| Permission System | gestion des accès |

---

# Stack Technique

## Backend

- Django
- Django REST Framework
- PostgreSQL
- Redis
- Celery

## Frontend

- Next.js
- TypeScript
- TailwindCSS

## IA

- Mistral AI

## Infrastructure

- Docker
- Nginx
- VPS Linux
- PostgreSQL

---

# Vision Long Terme

Gorfisca peut évoluer vers :
- un ERP africain,
- une plateforme fiscale,
- une infrastructure fintech,
- une banque PME,
- un moteur de scoring financier.

---

# Conclusion

Gorfisca n’est pas seulement :
- un logiciel de comptabilité,
- un ERP classique,
- un système de facturation.

C’est :

> une infrastructure financière intelligente conçue pour les PME africaines et conforme aux standards OHADA.
