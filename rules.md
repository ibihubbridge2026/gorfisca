# Gorfisca - Engineering Rules & Guidelines

## 1. Principes de Codage (Senior Level)
- **DRY (Don't Repeat Yourself)** : Avant de créer une fonction, vérifie TOUJOURS si elle existe déjà dans le module. Si une fonction doit être modifiée, modifie l'existante au lieu d'en créer une nouvelle.
- **KISS (Keep It Simple, Stupid)** : Privilégie la clarté et la logique à la longueur. Pas de code "over-engineered" inutile.
- **Single Responsibility** : Une fonction = une action. Une classe = un domaine métier.

## 2. Architecture Django & Python
- **Service Layer Strict** : INTERDICTION de mettre de la logique métier dans `views.py`. Toute la logique (calculs, validations comptables, exports) doit aller dans `apps/[module]/services.py`.
- **Modèles** : Utilise toujours `DecimalField` pour l'argent. Ajoute `created_at` et `updated_at` sur chaque modèle.
- **Immuabilité** : Les fonctions de `accounting/services.py` ne doivent jamais permettre la modification d'une écriture validée.

## 3. Maintenance & Scalabilité
- **Vérification d'existence** : Avant toute modification, analyse l'arborescence complète. Ne duplique JAMAIS de fichiers ou de dossiers.
- **Naming** : Utilise des noms explicites en anglais (ex: `post_transaction` au lieu de `save_data`).
- **Imports** : Utilise des imports explicites, évite les `from module import *`.

## 4. Frontend (Next.js)
- **Composants** : Divise l'UI en petits composants réutilisables dans `components/ui/`.
- **Types** : TypeScript strict obligatoire. Pas de type `any`.

## 5. Frontend & API Communication
- **API Fetching** : Utilise 'Axios' ou 'TanStack Query' pour les appels API.
- **D.R.Y Components** : Ne duplique pas le code Tailwind. Si un bouton revient 3 fois, crée un composant 'Button.tsx'.
- **Interface Mapping** : Les types TypeScript du Frontend DOIVENT correspondre aux Serializers du Backend.