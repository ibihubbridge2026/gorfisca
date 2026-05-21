# Gorfisca Frontend

Frontend Next.js pour la plateforme SaaS de comptabilité OHADA.

## 🎨 Design System "Financial Sanctuary"

Basé sur le dossier de design Stitch Ibihub Reconcile avec une palette moderne "African Luxury".

### Palette de Couleurs
- **Primary**: `#006947` (Émeraude profond)
- **Secondary**: `#006a6a` (Cyan)
- **Tertiary**: `#765700` (Ambre - alertes)
- **Surfaces**: `#f9f9fb` → `#e2e2e4` (gradients subtils)

### Typographie
- **Manrope**: Titres et chiffres (géométrique, premium)
- **Inter**: Corps de texte (lisibilité maximale)

### Principes Clés
- **No-Line Rule**: Pas de bordures 1px, utilisation des tons
- **Glassmorphism**: Overlays avec backdrop-blur
- **Asymétrie**: Layouts éditoriaux, espaces généreux

## 🏗️ Structure

```
src/
├── app/                    # App Router Next.js 13+
│   ├── accounting/         # Page comptabilité (prioritaire)
│   ├── globals.css         # Styles globaux + design system
│   └── layout.tsx         # Layout racine
├── components/
│   ├── ui/                # Composants atomes réutilisables
│   │   ├── Button.tsx     # CTA avec gradient émeraude
│   │   ├── Card.tsx       # Glassmorphism subtil
│   │   └── StatusBadge.tsx # Pills d'état
│   └── layout/            # Layouts principaux
│       ├── DashboardLayout.tsx
│       ├── Sidebar.tsx
│       └── Navbar.tsx
├── lib/
│   ├── utils.ts           # Utilitaires (formatage, etc.)
│   └── data/              # Données fictives
└── types/
    └── accounting.ts       # Types alignés backend Django
```

## 🚀 Démarrage

1. Installer les dépendances:
```bash
npm install
```

2. Lancer le serveur de développement:
```bash
npm run dev
```

3. Ouvrir [http://localhost:3000](http://localhost:3000)

## 🧩 Composants Clés

### Button.tsx
- **Primary**: Gradient émeraude avec ombre
- **Secondary**: Surface containers, pas de bordures
- **Tertiary**: Ghost style avec hover subtil

### Card.tsx
- **Glass**: Backdrop-blur avec transparence
- **Surface**: Tons de gris pour hiérarchie
- **Elevated**: Ombres douces "ambient"

### StatusBadge.tsx
- **Pills**: États Matched/Pending/Error
- **Reconcile Ribbon**: Bandes verticales pour tableaux

## 📊 Pages Implémentées

### `/accounting` - Plan Comptable OHADA
- Tableau des comptes avec soldes
- Filtres par type de compte
- Cartes résumé (Actifs/Passifs/Capitaux)
- Export PDF et actions

## 🔗 Intégration Backend

Les types TypeScript sont alignés avec les modèles Django:

```typescript
// Backend: apps.accounting.models.Account
interface Account {
  id: string
  code: string          // ex: "1010-001"
  label: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  account_class: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  // ... autres champs
}
```

## 📱 Responsive

- **Desktop**: Layouts asymétriques, sidebar fixe
- **Mobile**: Adaptation avec navigation hamburger
- **Tablets**: Grid adaptative, cards réorganisées

## 🎯 Prochaines Étapes

1. **API Integration**: Remplacer les données mock par TanStack Query
2. **Dashboard**: Page principale avec widgets
3. **Réconciliation**: Interface de matching mobile money
4. **Facturation**: Formulaires et liste factures
