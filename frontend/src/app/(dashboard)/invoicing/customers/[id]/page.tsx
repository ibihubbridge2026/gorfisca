'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  TrendingUp,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  Mail as MailIcon,
  Smartphone,
  MoreHorizontal,
  Building2,
  DollarSign
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, differenceInDays, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address: string
  tax_id: string
  company_type: string
  created_at: string
  updated_at: string
  is_active: boolean
  credit_limit?: number
  payment_terms: number
}

interface CustomerStats {
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  overdue_amount: number
  invoice_count: number
  paid_invoice_count: number
  overdue_invoice_count: number
  average_payment_days: number
  last_payment_date?: string
  last_invoice_date?: string
}

interface Transaction {
  id: number
  type: 'invoice' | 'payment' | 'credit_note'
  reference: string
  date: string
  description: string
  amount: number
  status: 'paid' | 'pending' | 'overdue' | 'draft'
  due_date?: string
  payment_method?: string
}

export default function CustomerDetailPage() {
  const t = useTranslations('invoicing')
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const customerId = parseInt(params.id as string)

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics'>('overview')

  // Fetch customer details
  const { data: customer, isLoading: customerLoading, error: customerError } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      // Mock data - replace with actual API
      return {
        id: customerId,
        name: 'Société ABC',
        email: 'contact@abc.com',
        phone: '+225 20 22 33 44',
        address: 'Abidjan, Cocody, Rue des Princes, BP 1234',
        tax_id: 'CI123456789',
        company_type: 'SARL',
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-05-20T14:30:00Z',
        is_active: true,
        credit_limit: 5000000,
        payment_terms: 30
      }
    },
    enabled: !isNaN(customerId),
    staleTime: 2 * 60 * 1000
  })

  // Fetch customer stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['customer-stats', customerId],
    queryFn: async () => {
      // Mock data - replace with actual API
      return {
        total_invoiced: 12500000,
        total_paid: 10200000,
        total_outstanding: 2300000,
        overdue_amount: 450000,
        invoice_count: 15,
        paid_invoice_count: 12,
        overdue_invoice_count: 2,
        average_payment_days: 22,
        last_payment_date: '2026-05-15T10:30:00Z',
        last_invoice_date: '2026-05-18T14:20:00Z'
      }
    },
    enabled: !isNaN(customerId),
    staleTime: 2 * 60 * 1000
  })

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['customer-transactions', customerId],
    queryFn: async () => {
      // Mock data - replace with actual API
      return [
        {
          id: 1,
          type: 'invoice' as const,
          reference: 'INV-2026-015',
          date: '2026-05-18T14:20:00Z',
          description: 'Services de consulting - Mai 2026',
          amount: 850000,
          status: 'pending' as const,
          due_date: '2026-06-18T14:20:00Z'
        },
        {
          id: 2,
          type: 'payment' as const,
          reference: 'PAY-2026-008',
          date: '2026-05-15T10:30:00Z',
          description: 'Paiement facture INV-2026-014',
          amount: -1200000,
          status: 'paid' as const,
          payment_method: 'bank_transfer'
        },
        {
          id: 3,
          type: 'invoice' as const,
          reference: 'INV-2026-014',
          date: '2026-05-10T09:15:00Z',
          description: 'Développement web - Phase 2',
          amount: 1200000,
          status: 'paid' as const,
          due_date: '2026-06-10T09:15:00Z'
        },
        {
          id: 4,
          type: 'credit_note' as const,
          reference: 'CN-2026-002',
          date: '2026-05-05T16:45:00Z',
          description: 'Avoir sur facture INV-2026-013',
          amount: -150000,
          status: 'paid' as const
        },
        {
          id: 5,
          type: 'invoice' as const,
          reference: 'INV-2026-013',
          date: '2026-04-28T11:30:00Z',
          description: 'Maintenance système - Avril 2026',
          amount: 750000,
          status: 'overdue' as const,
          due_date: '2026-05-28T11:30:00Z'
        }
      ]
    },
    enabled: !isNaN(customerId),
    staleTime: 30 * 1000
  })

  // Loading states
  if (customerLoading || statsLoading || transactionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info Skeleton */}
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </Card>

          {/* Stats Skeleton */}
          <Card className="p-6 lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Transactions Skeleton */}
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-surface-container-low rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  // Error states
  if (customerError) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          {t('customer_not_found')}
        </h3>
        <p className="text-on-surface-variant mb-4">
          {t('customer_not_found_description')}
        </p>
        <Button onClick={() => router.push('/(dashboard)/invoicing/customers')}>
          {t('back_to_customers')}
        </Button>
      </Card>
    )
  }

  if (!customer) {
    return null
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <FileText className="w-4 h-4 text-blue-600" />
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-600" />
      case 'credit_note':
        return <ArrowLeft className="w-4 h-4 text-amber-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const getTransactionBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">{t('paid')}</Badge>
      case 'pending':
        return <Badge variant="warning">{t('pending')}</Badge>
      case 'overdue':
        return <Badge variant="error">{t('overdue')}</Badge>
      case 'draft':
        return <Badge variant="secondary">{t('draft')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDaysOverdue = (dueDate: string) => {
    return differenceInDays(new Date(), parseISO(dueDate))
  }

  const getPaymentProgress = () => {
    if (!stats || stats.total_invoiced === 0) return 0
    return (stats.total_paid / stats.total_invoiced) * 100
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <a href="/(dashboard)/invoicing/customers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('back_to_customers')}
            </a>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              {customer.name}
            </h1>
            <p className="text-on-surface-variant">
              {customer.company_type} • {t('customer_since')} {format(new Date(customer.created_at), 'MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={customer.is_active ? 'success' : 'secondary'}>
            {customer.is_active ? t('active') : t('inactive')}
          </Badge>
          <Button variant="outline">
            <MailIcon className="w-4 h-4 mr-2" />
            {t('send_email')}
          </Button>
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            {t('create_invoice')}
          </Button>
        </div>
      </div>

      {/* Customer Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-on-surface">{customer.name}</h2>
                <p className="text-sm text-on-surface-variant">{customer.company_type}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface">{customer.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface">{customer.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface">
                  {t('tax_id')}: {customer.tax_id}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface">
                  {t('payment_terms')}: {customer.payment_terms} {t('days')}
                </span>
              </div>
              {customer.credit_limit && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-on-surface-variant" />
                  <span className="text-sm text-on-surface">
                    {t('credit_limit')}: {customer.credit_limit.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Stats Overview */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-on-surface mb-6">
            {t('financial_overview')}
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('total_invoiced')}</p>
              <p className="text-xl font-semibold text-on-surface">
                {stats?.total_invoiced.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('total_paid')}</p>
              <p className="text-xl font-semibold text-emerald-600">
                {stats?.total_paid.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('outstanding')}</p>
              <p className="text-xl font-semibold text-amber-600">
                {stats?.total_outstanding.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('overdue')}</p>
              <p className="text-xl font-semibold text-error">
                {stats?.overdue_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-on-surface-variant">{t('payment_progress')}</span>
                <span className="text-sm font-medium text-on-surface">{Math.round(getPaymentProgress())}%</span>
              </div>
              <Progress value={getPaymentProgress()} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-on-surface">{stats?.invoice_count}</p>
                <p className="text-xs text-on-surface-variant">{t('total_invoices')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats?.paid_invoice_count}</p>
                <p className="text-xs text-on-surface-variant">{t('paid_invoices')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-error">{stats?.overdue_invoice_count}</p>
                <p className="text-xs text-on-surface-variant">{t('overdue_invoices')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-container-low">
              <div>
                <p className="text-sm text-on-surface-variant">{t('avg_payment_days')}</p>
                <p className="text-lg font-semibold text-on-surface">{stats?.average_payment_days} {t('days')}</p>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant">{t('last_payment')}</p>
                <p className="text-lg font-semibold text-on-surface">
                  {stats?.last_payment_date ? 
                    format(new Date(stats.last_payment_date), 'dd MMM yyyy', { locale: fr }) : 
                    t('never')
                  }
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-container-low">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: t('overview'), icon: User },
            { id: 'transactions', label: t('transactions'), icon: FileText },
            { id: 'analytics', label: t('analytics'), icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-on-surface mb-4">
                {t('recent_activity')}
              </h3>
              
              <div className="space-y-3">
                {transactions?.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border border-surface-container-low rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="font-medium text-on-surface">{transaction.reference}</p>
                        <p className="text-sm text-on-surface-variant">{transaction.description}</p>
                        <p className="text-xs text-on-surface-variant">
                          {format(new Date(transaction.date), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.amount < 0 ? 'text-emerald-600' : 'text-on-surface'
                      }`}>
                        {transaction.amount < 0 ? '+' : ''}
                        {Math.abs(transaction.amount).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                      </p>
                      {getTransactionBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'transactions' && (
          <motion.div
            key="transactions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-on-surface mb-4">
                {t('all_transactions')}
              </h3>
              
              <div className="space-y-3">
                {transactions?.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border border-surface-container-low rounded-lg hover:bg-surface-container-low/30 transition-colors">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-on-surface">{transaction.reference}</p>
                          {getTransactionBadge(transaction.status)}
                        </div>
                        <p className="text-sm text-on-surface-variant">{transaction.description}</p>
                        <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                          <span>{format(new Date(transaction.date), 'dd MMM yyyy', { locale: fr })}</span>
                          {transaction.due_date && (
                            <span>
                              {t('due')}: {format(new Date(transaction.due_date), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          )}
                          {transaction.payment_method && (
                            <span>{t('via')}: {transaction.payment_method}</span>
                          )}
                          {transaction.status === 'overdue' && transaction.due_date && (
                            <span className="text-error">
                              {getDaysOverdue(transaction.due_date)} {t('days_overdue')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.amount < 0 ? 'text-emerald-600' : 'text-on-surface'
                        }`}>
                          {transaction.amount < 0 ? '+' : ''}
                          {Math.abs(transaction.amount).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                        </p>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            {t('view')}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            {t('download')}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MailIcon className="w-4 h-4 mr-2" />
                            {t('send_email')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-on-surface mb-4">
                  {t('payment_trends')}
                </h3>
                <div className="h-64 flex items-center justify-center text-on-surface-variant">
                  {t('chart_placeholder')}
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-on-surface mb-4">
                  {t('invoice_distribution')}
                </h3>
                <div className="h-64 flex items-center justify-center text-on-surface-variant">
                  {t('chart_placeholder')}
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
