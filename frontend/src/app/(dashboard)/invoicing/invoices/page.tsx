'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Plus, 
  Eye, 
  Download,
  Mail,
  Smartphone,
  Search,
  Filter,
  Calendar,
  User,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  DataTable,
  DataTableColumn,
  DataTableRowActions
} from '@/components/ui/data-table'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Invoice {
  id: number
  reference: string
  customer_name: string
  customer_email: string
  invoice_date: string
  due_date: string
  status: 'draft' | 'sent' | 'overdue' | 'paid' | 'partially_paid'
  subtotal: number
  tax_total: number
  total: number
  paid_amount: number
  remaining_amount: number
  items_count: number
  notes?: string
  payment_method?: string
  created_at: string
  updated_at: string
}

export default function InvoicesPage() {
  const t = useTranslations('invoicing')
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30d')

  // Fetch invoices with TanStack Query
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['invoices', { status: selectedStatus, dateRange }],
    queryFn: async () => {
      // Mock data - replace with actual API
      return [
        {
          id: 1,
          reference: 'INV-2026-001',
          customer_name: 'Société ABC',
          customer_email: 'contact@abc.com',
          invoice_date: '2026-05-15T10:00:00Z',
          due_date: '2026-06-15T10:00:00Z',
          status: 'paid' as const,
          subtotal: 850000,
          tax_total: 153000,
          total: 1003000,
          paid_amount: 1003000,
          remaining_amount: 0,
          items_count: 3,
          payment_method: 'bank_transfer',
          created_at: '2026-05-15T10:00:00Z',
          updated_at: '2026-05-20T14:30:00Z'
        },
        {
          id: 2,
          reference: 'INV-2026-002',
          customer_name: 'Entreprise XYZ',
          customer_email: 'facturation@xyz.com',
          invoice_date: '2026-05-18T14:30:00Z',
          due_date: '2026-06-18T14:30:00Z',
          status: 'partially_paid' as const,
          subtotal: 450000,
          tax_total: 81000,
          total: 531000,
          paid_amount: 200000,
          remaining_amount: 331000,
          items_count: 2,
          payment_method: 'mobile_money',
          created_at: '2026-05-18T14:30:00Z',
          updated_at: '2026-05-21T09:15:00Z'
        },
        {
          id: 3,
          reference: 'INV-2026-003',
          customer_name: 'Client DEF',
          customer_email: 'def@example.com',
          invoice_date: '2026-05-20T16:45:00Z',
          due_date: '2026-06-20T16:45:00Z',
          status: 'overdue' as const,
          subtotal: 320000,
          tax_total: 57600,
          total: 377600,
          paid_amount: 0,
          remaining_amount: 377600,
          items_count: 1,
          created_at: '2026-05-20T16:45:00Z',
          updated_at: '2026-05-20T16:45:00Z'
        },
        {
          id: 4,
          reference: 'INV-2026-004',
          customer_name: 'Société GHI',
          customer_email: 'contact@ghi.com',
          invoice_date: '2026-05-21T11:20:00Z',
          due_date: '2026-06-21T11:20:00Z',
          status: 'draft' as const,
          subtotal: 180000,
          tax_total: 32400,
          total: 212400,
          paid_amount: 0,
          remaining_amount: 212400,
          items_count: 4,
          created_at: '2026-05-21T11:20:00Z',
          updated_at: '2026-05-21T11:20:00Z'
        }
      ]
    },
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000
  })

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true, invoiceId }
    },
    onSuccess: () => {
      // Show success notification
    }
  })

  // Generate payment link mutation
  const generatePaymentLinkMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true, invoiceId, paymentLink: `https://pay.gorfisca.com/inv/${invoiceId}` }
    },
    onSuccess: (data) => {
      // Copy payment link to clipboard
      navigator.clipboard.writeText(data.paymentLink)
    }
  })

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return []

    return invoices.filter(invoice => {
      const matchesSearch = searchTerm === '' || 
        invoice.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer_email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = selectedStatus === 'all' || invoice.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [invoices, searchTerm, selectedStatus])

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-4 h-4 text-gray-600" />
      case 'sent':
        return <Mail className="w-4 h-4 text-blue-600" />
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />
      case 'partially_paid':
        return <Clock className="w-4 h-4 text-amber-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const getPaymentProgress = (invoice: Invoice) => {
    if (invoice.total === 0) return 0
    return (invoice.paid_amount / invoice.total) * 100
  }

  // Define columns for DataTable
  const columns: DataTableColumn<Invoice>[] = [
    {
      key: 'reference',
      title: t('reference'),
      sortable: true,
      render: (invoice) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(invoice.status)}
          <span className="font-medium text-on-surface">{invoice.reference}</span>
        </div>
      )
    },
    {
      key: 'customer',
      title: t('customer'),
      render: (invoice) => (
        <div>
          <div className="font-medium text-on-surface">{invoice.customer_name}</div>
          <div className="text-sm text-on-surface-variant">{invoice.customer_email}</div>
        </div>
      )
    },
    {
      key: 'date',
      title: t('date'),
      sortable: true,
      render: (invoice) => (
        <div>
          <div className="text-sm text-on-surface">
            {format(new Date(invoice.invoice_date), 'dd MMM yyyy', { locale: fr })}
          </div>
          <div className="text-xs text-on-surface-variant">
            {t('due')}: {format(new Date(invoice.due_date), 'dd MMM', { locale: fr })}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: t('status'),
      render: (invoice) => (
        <div className="space-y-2">
          {getStatusBadge(invoice.status)}
          {invoice.status === 'partially_paid' && (
            <Progress value={getPaymentProgress(invoice)} className="w-20 h-2" />
          )}
        </div>
      )
    },
    {
      key: 'amount',
      title: t('amount'),
      sortable: true,
      render: (invoice) => (
        <div className="text-right">
          <div className="font-semibold text-on-surface">
            {invoice.total.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
          </div>
          {invoice.status === 'partially_paid' && (
            <div className="text-xs text-on-surface-variant">
              {invoice.paid_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })} / {invoice.total.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      title: t('actions'),
      render: (invoice) => (
        <DataTableRowActions>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={`/(dashboard)/invoicing/invoices/${invoice.id}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  {t('view')}
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                {t('download_pdf')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => sendEmailMutation.mutate(invoice.id)}
                disabled={sendEmailMutation.isPending}
              >
                <Mail className="w-4 h-4 mr-2" />
                {t('send_email')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => generatePaymentLinkMutation.mutate(invoice.id)}
                disabled={generatePaymentLinkMutation.isPending}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                {t('payment_link')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableRowActions>
      )
    }
  ]

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card className="p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </Card>

        {/* Table Skeleton */}
        <Card className="p-6">
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 p-4 border border-surface-container-low rounded-lg">
                {[...Array(6)].map((_, j) => (
                  <Skeleton key={j} className="h-4" />
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          {t('error_loading_invoices')}
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
            {t('invoices')}
          </h1>
          <p className="text-on-surface-variant">
            {t('invoices_description')}
          </p>
        </div>
        
        <Button asChild>
          <a href="/(dashboard)/invoicing/invoices/create">
            <Plus className="w-4 h-4 mr-2" />
            {t('create_invoice')}
          </a>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('revenue_this_month')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {filteredInvoices
                  .filter(i => i.status === 'paid')
                  .reduce((sum, i) => sum + i.total, 0)
                  .toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('outstanding')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {filteredInvoices
                  .filter(i => i.status === 'overdue' || i.status === 'partially_paid')
                  .reduce((sum, i) => sum + i.remaining_amount, 0)
                  .toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('overdue_invoices')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {filteredInvoices.filter(i => i.status === 'overdue').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('total_invoices')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {filteredInvoices.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <Input
                type="text"
                placeholder={t('search_invoices')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_status')}</SelectItem>
                <SelectItem value="draft">{t('draft')}</SelectItem>
                <SelectItem value="sent">{t('sent')}</SelectItem>
                <SelectItem value="overdue">{t('overdue')}</SelectItem>
                <SelectItem value="paid">{t('paid')}</SelectItem>
                <SelectItem value="partially_paid">{t('partially_paid')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('last_7_days')}</SelectItem>
                <SelectItem value="30d">{t('last_30_days')}</SelectItem>
                <SelectItem value="90d">{t('last_90_days')}</SelectItem>
                <SelectItem value="all">{t('all_time')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Invoice Table */}
      <Card className="p-6">
        <DataTable
          data={filteredInvoices}
          columns={columns}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalItems: filteredInvoices.length,
            pageSize: 25,
            onPageChange: (page) => console.log('Page changed to:', page),
            onPageSizeChange: (pageSize) => console.log('Page size changed to:', pageSize)
          }}
          emptyState={{
            icon: FileText,
            title: t('no_invoices'),
            description: t('no_invoices_description'),
            action: {
              label: t('create_first_invoice'),
              href: '/(dashboard)/invoicing/invoices/create'
            }
          }}
        />
      </Card>

      {/* Success Notifications */}
      <AnimatePresence>
        {sendEmailMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-900">
                    {t('email_sent')}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {t('email_sent_description')}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {generatePaymentLinkMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {t('payment_link_generated')}
                  </p>
                  <p className="text-xs text-blue-700">
                    {t('payment_link_copied')}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
