'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Users, 
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Eye,
  Download,
  Mail as MailIcon
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

interface DashboardStats {
  revenue_this_month: number
  revenue_last_month: number
  outstanding_amount: number
  overdue_amount: number
  total_invoices: number
  paid_invoices: number
  draft_invoices: number
  overdue_invoices: number
  avg_payment_days: number
  new_customers_this_month: number
  top_customers: TopCustomer[]
  monthly_revenue: MonthlyRevenue[]
  payment_methods: PaymentMethod[]
}

interface TopCustomer {
  id: number
  name: string
  email: string
  total_invoiced: number
  total_paid: number
  outstanding_amount: number
  invoice_count: number
  avg_payment_days: number
}

interface MonthlyRevenue {
  month: string
  invoiced: number
  paid: number
  outstanding: number
}

interface PaymentMethod {
  method: string
  amount: number
  percentage: number
  count: number
}

interface RecentInvoice {
  id: number
  reference: string
  customer_name: string
  amount: number
  status: 'draft' | 'sent' | 'overdue' | 'paid' | 'partially_paid'
  due_date: string
  created_at: string
}

export default function InvoicingDashboardPage() {
  const t = useTranslations('invoicing')
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '1y'>('30d')

  // Fetch dashboard data
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['invoicing-dashboard', selectedPeriod],
    queryFn: async () => {
      // Mock data - replace with actual API
      return {
        revenue_this_month: 8500000,
        revenue_last_month: 7200000,
        outstanding_amount: 3200000,
        overdue_amount: 850000,
        total_invoices: 45,
        paid_invoices: 32,
        draft_invoices: 5,
        overdue_invoices: 8,
        avg_payment_days: 22,
        new_customers_this_month: 12,
        top_customers: [
          {
            id: 1,
            name: 'Société ABC',
            email: 'contact@abc.com',
            total_invoiced: 12500000,
            total_paid: 10200000,
            outstanding_amount: 2300000,
            invoice_count: 15,
            avg_payment_days: 20
          },
          {
            id: 2,
            name: 'Entreprise XYZ',
            email: 'facturation@xyz.com',
            total_invoiced: 8900000,
            total_paid: 8900000,
            outstanding_amount: 0,
            invoice_count: 12,
            avg_payment_days: 15
          },
          {
            id: 3,
            name: 'Client DEF',
            email: 'def@example.com',
            total_invoiced: 5600000,
            total_paid: 4200000,
            outstanding_amount: 1400000,
            invoice_count: 8,
            avg_payment_days: 28
          },
          {
            id: 4,
            name: 'Société GHI',
            email: 'contact@ghi.com',
            total_invoiced: 4200000,
            total_paid: 3500000,
            outstanding_amount: 700000,
            invoice_count: 6,
            avg_payment_days: 18
          },
          {
            id: 5,
            name: 'Client JKL',
            email: 'jkl@example.com',
            total_invoiced: 3100000,
            total_paid: 2100000,
            outstanding_amount: 1000000,
            invoice_count: 4,
            avg_payment_days: 35
          }
        ],
        monthly_revenue: [
          { month: 'Jan', invoiced: 6200000, paid: 5800000, outstanding: 400000 },
          { month: 'Fév', invoiced: 7100000, paid: 6900000, outstanding: 200000 },
          { month: 'Mar', invoiced: 8900000, paid: 8200000, outstanding: 700000 },
          { month: 'Avr', invoiced: 7600000, paid: 7400000, outstanding: 200000 },
          { month: 'Mai', invoiced: 8500000, paid: 7200000, outstanding: 1300000 },
          { month: 'Juin', invoiced: 9200000, paid: 8500000, outstanding: 700000 }
        ],
        payment_methods: [
          { method: 'Virement bancaire', amount: 15600000, percentage: 65, count: 28 },
          { method: 'Mobile Money', amount: 7200000, percentage: 30, count: 12 },
          { method: 'Espèces', amount: 1200000, percentage: 5, count: 5 }
        ]
      } as DashboardStats
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  })

  // Fetch recent invoices
  const { data: recentInvoices } = useQuery({
    queryKey: ['recent-invoices'],
    queryFn: async () => {
      return [
        {
          id: 1,
          reference: 'INV-2026-045',
          customer_name: 'Société ABC',
          amount: 850000,
          status: 'paid' as const,
          due_date: '2026-05-15T10:00:00Z',
          created_at: '2026-05-01T10:00:00Z'
        },
        {
          id: 2,
          reference: 'INV-2026-046',
          customer_name: 'Entreprise XYZ',
          amount: 1200000,
          status: 'partially_paid' as const,
          due_date: '2026-06-18T14:30:00Z',
          created_at: '2026-05-18T14:30:00Z'
        },
        {
          id: 3,
          reference: 'INV-2026-047',
          customer_name: 'Client DEF',
          amount: 650000,
          status: 'overdue' as const,
          due_date: '2026-05-10T09:15:00Z',
          created_at: '2026-04-25T09:15:00Z'
        },
        {
          id: 4,
          reference: 'INV-2026-048',
          customer_name: 'Société GHI',
          amount: 450000,
          status: 'draft' as const,
          due_date: '2026-06-25T11:20:00Z',
          created_at: '2026-05-21T11:20:00Z'
        }
      ] as RecentInvoice[]
    },
    staleTime: 30 * 1000
  })

  // Calculate revenue growth
  const revenueGrowth = useMemo(() => {
    if (!stats) return 0
    return ((stats.revenue_this_month - stats.revenue_last_month) / stats.revenue_last_month) * 100
  }, [stats])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">{t('draft')}</Badge>
      case 'sent':
        return <Badge variant="outline">{t('sent')}</Badge>
      case 'overdue':
        return <Badge variant="error">{t('overdue')}</Badge>
      case 'paid':
        return <Badge variant="success">{t('paid')}</Badge>
      case 'partially_paid':
        return <Badge variant="warning">{t('partially_paid')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          {t('error_loading_dashboard')}
        </h3>
        <p className="text-on-surface-variant mb-4">
          {error instanceof Error ? error.message : t('unknown_error')}
        </p>
        <Button onClick={() => window.location.reload()}>
          {t('retry')}
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t('dashboard')}
          </h1>
          <p className="text-on-surface-variant">
            {t('dashboard_description')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">{t('last_30_days')}</SelectItem>
              <SelectItem value="90d">{t('last_90_days')}</SelectItem>
              <SelectItem value="1y">{t('last_year')}</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            {t('create_invoice')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue This Month */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                revenueGrowth >= 0 ? 'text-emerald-600' : 'text-error'
              }`}>
                {revenueGrowth >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {Math.abs(revenueGrowth).toFixed(1)}%
              </div>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('revenue_this_month')}</p>
              <p className="text-2xl font-bold text-on-surface">
                {stats?.revenue_this_month.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                {t('vs')} {stats?.revenue_last_month.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })} {t('last_month')}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Outstanding Amount */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <Badge variant="warning" className="text-xs">
                {stats?.overdue_invoices} {t('overdue')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('outstanding_amount')}</p>
              <p className="text-2xl font-bold text-on-surface">
                {stats?.outstanding_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
              <p className="text-xs text-error mt-1">
                {stats?.overdue_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })} {t('overdue')}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Total Invoices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-600 font-medium">
                  {stats?.paid_invoices}/{stats?.total_invoices}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('total_invoices')}</p>
              <p className="text-2xl font-bold text-on-surface">{stats?.total_invoices}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="success" className="text-xs">{stats?.paid_invoices} {t('paid')}</Badge>
                <Badge variant="warning" className="text-xs">{stats?.overdue_invoices} {t('overdue')}</Badge>
                <Badge variant="secondary" className="text-xs">{stats?.draft_invoices} {t('draft')}</Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* New Customers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('new_customers')}</p>
              <p className="text-2xl font-bold text-on-surface">{stats?.new_customers_this_month}</p>
              <p className="text-xs text-on-surface-variant mt-1">
                {t('avg_payment_days')}: {stats?.avg_payment_days} {t('days')}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4">
              {t('monthly_revenue')}
            </h3>
            <div className="h-64">
              {/* Stacked Bar Chart Placeholder */}
              <div className="h-full flex items-end justify-between gap-2 px-2">
                {stats?.monthly_revenue.map((month, index) => (
                  <div key={month.month} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col-reverse">
                      {/* Paid Amount */}
                      <div 
                        className="bg-emerald-500 rounded-t"
                        style={{ height: `${(month.paid / 10000000) * 100}%` }}
                      />
                      {/* Outstanding Amount */}
                      <div 
                        className="bg-amber-500"
                        style={{ height: `${(month.outstanding / 10000000) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-on-surface-variant mt-2">{month.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded" />
                  <span className="text-xs text-on-surface-variant">{t('paid')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded" />
                  <span className="text-xs text-on-surface-variant">{t('outstanding')}</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4">
              {t('payment_methods')}
            </h3>
            <div className="space-y-4">
              {stats?.payment_methods.map((method, index) => (
                <div key={method.method} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-on-surface">{method.method}</span>
                    <span className="text-sm text-on-surface-variant">
                      {method.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={method.percentage} className="flex-1 h-2" />
                    <span className="text-sm text-on-surface-variant w-12 text-right">
                      {method.percentage}%
                    </span>
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {method.count} {t('transactions')}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4">
              {t('top_customers')}
            </h3>
            <div className="space-y-3">
              {stats?.top_customers.map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 border border-surface-container-low rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-on-surface text-sm">{customer.name}</p>
                      <p className="text-xs text-on-surface-variant">{customer.invoice_count} {t('invoices')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-on-surface text-sm">
                      {customer.total_invoiced.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {customer.avg_payment_days} {t('days')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Recent Invoices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-on-surface">
                {t('recent_invoices')}
              </h3>
              <Button variant="outline" size="sm" asChild>
                <a href="/(dashboard)/invoicing/invoices">
                  {t('view_all')}
                </a>
              </Button>
            </div>
            <div className="space-y-3">
              {recentInvoices?.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border border-surface-container-low rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-on-surface text-sm">{invoice.reference}</p>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-xs text-on-surface-variant">{invoice.customer_name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {format(new Date(invoice.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-on-surface text-sm">
                      {invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                    </p>
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
      </div>
    </div>
  )
}
