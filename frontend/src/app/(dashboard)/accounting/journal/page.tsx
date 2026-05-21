'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { 
  FileText, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle,
  XCircle,
  Clock,
  Hash,
  MoreHorizontal,
  Filter
} from 'lucide-react'
import { 
  DataTable,
  DataTableRowActions
} from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import accountingService from '@/services/api/accounting.service'
import { ValidationBadge } from '@/components/accounting/ValidationBadge'
import { ValidateEntryButtonCompact } from '@/components/accounting/ValidateEntryButton'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { JournalEntry } from '@/types/accounting'

export default function JournalPage() {
  const t = useTranslations('accounting')
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25 })
  const [filters, setFilters] = useState({
    is_posted: undefined as boolean | undefined,
    source: undefined as string | undefined,
    search: ''
  })

  // Fetch journal entries with TanStack Query
  const { data: entries, isLoading, error, refetch } = useQuery({
    queryKey: ['journal-entries', pagination, filters],
    queryFn: () => accountingService.fetchJournalEntries({
      is_posted: filters.is_posted,
      search: filters.search || undefined,
      ordering: '-date,-created_at',
      page: pagination.page,
      page_size: pagination.pageSize
    }),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  const handleValidateSuccess = () => {
    refetch()
  }

  // Define columns for DataTable
  const columns: ColumnDef<JournalEntry>[] = [
    {
      accessorKey: 'reference',
      header: t('reference'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-on-surface">{row.original.reference}</span>
          {row.original.hash && (
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-emerald-600" />
              <Badge 
                variant="success" 
                className="text-xs px-1.5 py-0.5"
              >
                Hash OK
              </Badge>
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'date',
      header: t('date'),
      cell: ({ row }) => (
        <span className="text-on-surface-variant">
          {format(new Date(row.original.date), 'dd MMM yyyy', { locale: fr })}
        </span>
      )
    },
    {
      accessorKey: 'description',
      header: t('description'),
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="text-on-surface truncate">{row.original.description}</p>
        </div>
      )
    },
    {
      accessorKey: 'validation',
      header: t('validation_status'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ValidationBadge
            source={row.original.source}
            is_validated={row.original.is_validated}
            validated_by={row.original.validated_by}
            validated_at={row.original.validated_at}
            size="sm"
          />
          {row.original.is_posted && (
            <Badge variant={row.original.is_balanced ? 'success' : 'error'}>
              {row.original.is_posted ? 'Validée' : 'Brouillon'}
            </Badge>
          )}
        </div>
      )
    },
    {
      accessorKey: 'amounts',
      header: t('amounts'),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="text-sm">
            <span className="text-on-surface-variant">Débit: </span>
            <span className="font-medium text-error">{row.original.total_debit?.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</span>
          </div>
          <div className="text-sm">
            <span className="text-on-surface-variant">Crédit: </span>
            <span className="font-medium text-emerald-600">{row.original.total_credit?.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</span>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'balance',
      header: t('balance'),
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.is_balanced ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <XCircle className="w-5 h-5 text-error" />
          )}
        </div>
      )
    },
    {
      id: 'actions',
      header: t('actions'),
      cell: ({ row }) => (
        <DataTableRowActions>
          {/* Validate AI Entry Button */}
          {row.original.source === 'ai_suggestion' && !row.original.is_validated && (
            <ValidateEntryButtonCompact
              entryId={Number(row.original.id)}
              entryReference={row.original.reference}
              onValidated={handleValidateSuccess}
            />
          )}
          
          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={`/(dashboard)/accounting/${row.original.id}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  {t('view_details')}
                </a>
              </DropdownMenuItem>
              {!row.original.is_posted && (
                <DropdownMenuItem asChild>
                  <a href={`/(dashboard)/accounting/${row.original.id}/edit`}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t('edit')}
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <a href={`/(dashboard)/accounting/${row.original.id}/verify`}>
                  <Hash className="w-4 h-4 mr-2" />
                  {t('verify_blockchain')}
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableRowActions>
      )
    }
  ]

  // Loading state with Skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Filters Skeleton */}
        <Card className="p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
          </div>
        </Card>

        {/* Table Skeleton */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* Header Row */}
            <div className="grid grid-cols-7 gap-4">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-4" />
              ))}
            </div>
            {/* Data Rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-4">
                {[...Array(7)].map((_, j) => (
                  <Skeleton key={j} className="h-8" />
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    const errorMessage = error instanceof Error ? error.message : t('error_loading_entries')
    
    // Handle 403 multi-tenant errors
    if (errorMessage.includes('403') || errorMessage.includes('permission')) {
      return (
        <Card className="p-6 text-center">
          <XCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">
            {t('access_denied')}
          </h3>
          <p className="text-on-surface-variant mb-4">
            {t('multi_tenant_access_error')}
          </p>
          <Button onClick={() => refetch()}>
            {t('retry')}
          </Button>
        </Card>
      )
    }

    return (
      <Card className="p-6 text-center">
        <XCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          {t('error_loading_data')}
        </h3>
        <p className="text-on-surface-variant mb-4">{errorMessage}</p>
        <Button onClick={() => refetch()}>
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
            {t('journal')}
          </h1>
          <p className="text-on-surface-variant">
            {t('journal_description')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="ghost">
            <Filter className="w-4 h-4 mr-2" />
            {t('filters')}
          </Button>
          <Button>
            <a href="/(dashboard)/accounting/new" className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              {t('new_entry')}
            </a>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-on-surface mb-2">
              {t('search')}
            </label>
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-surface-container-low rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">
              {t('status')}
            </label>
            <select
              value={filters.is_posted === undefined ? '' : filters.is_posted.toString()}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                is_posted: e.target.value === '' ? undefined : e.target.value === 'true'
              }))}
              className="px-3 py-2 border border-surface-container-low rounded-lg bg-surface text-on-surface"
            >
              <option value="">{t('all')}</option>
              <option value="true">{t('posted')}</option>
              <option value="false">{t('draft')}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">
              {t('source')}
            </label>
            <select
              value={filters.source || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value || undefined }))}
              className="px-3 py-2 border border-surface-container-low rounded-lg bg-surface text-on-surface"
            >
              <option value="">{t('all_sources')}</option>
              <option value="manual">{t('manual')}</option>
              <option value="api">{t('api')}</option>
              <option value="ai_suggestion">{t('ai_suggestion')}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="p-6">
        <DataTable
          data={entries || []}
          columns={columns}
        />
      </Card>
    </div>
  )
}
