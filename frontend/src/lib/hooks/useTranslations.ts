import {useTranslations} from 'next-intl';

// Hook pour utiliser les traductions avec typage
export function useT() {
  return useTranslations();
}

// Hooks spécifiques pour les sections
export function useAuthTranslations() {
  return useTranslations('auth');
}

export function useAccountingTranslations() {
  return useTranslations('accounting');
}

export function useInvoicingTranslations() {
  return useTranslations('invoicing');
}

export function useReconciliationTranslations() {
  return useTranslations('reconciliation');
}

export function useReportingTranslations() {
  return useTranslations('reporting');
}

export function useCommonTranslations() {
  return useTranslations('common');
}

export function useNavigationTranslations() {
  return useTranslations('navigation');
}

export function useDashboardTranslations() {
  return useTranslations('dashboard');
}

export function useStatusTranslations() {
  return useTranslations('status');
}
