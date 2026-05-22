'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Filter, 
  Calendar, 
  User,
  Shield,
  FileText,
  Settings,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { 
  DataTable,
  DataTableColumn,
  DataTableRowActions
} from '@/components/ui/data-table'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AuditLogEntry {
  id: string
  timestamp: string
  user_id: number
  user_name: string
  user_email: string
  action: string
  resource_type: string
  resource_id: string
  description: string
  ip_address: string
  user_agent: string
  status: 'success' | 'failure' | 'warning'
  severity: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, any>
}

interface User {
  id: number
  name: string
  email: string
  role: string
  last_login?: string
}

export default function AuditLogPage() {
  const t = useTranslations('reports')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('7d')
  const [customDateStart, setCustomDateStart] = useState<string>('')
  const [customDateEnd, setCustomDateEnd] = useState<string>('')

  // Fetch audit logs
  const { data: auditLogs, isLoading, error } = useQuery({
    queryKey: ['audit-logs', { user: selectedUser, action: selectedAction, status: selectedStatus, severity: selectedSeverity, dateRange }],
    queryFn: async () => {
      // Mock data - replace with actual API
      return [
        {
          id: 'audit_001',
          timestamp: '2026-05-21T14:30:15Z',
          user_id: 1,
          user_name: 'Jean Dupont',
          user_email: 'jean.dupont@gorfisca.com',
          action: 'login',
          resource_type: 'auth',
          resource_id: 'session_123',
          description: 'Connexion réussie au tableau de bord',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success' as const,
          severity: 'low' as const,
          metadata: {
            session_duration: 7200,
            login_method: 'password'
          }
        },
        {
          id: 'audit_002',
          timestamp: '2026-05-21T14:25:30Z',
          user_id: 2,
          user_name: 'Marie Koné',
          user_email: 'marie.kone@gorfisca.com',
          action: 'create_invoice',
          resource_type: 'invoice',
          resource_id: 'INV-2026-045',
          description: 'Création de la facture INV-2026-045 pour Client ABC',
          ip_address: '192.168.1.105',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          status: 'success' as const,
          severity: 'medium' as const,
          metadata: {
            invoice_amount: 850000,
            customer_id: 15,
            items_count: 3
          }
        },
        {
          id: 'audit_003',
          timestamp: '2026-05-21T14:20:45Z',
          user_id: 1,
          user_name: 'Jean Dupont',
          user_email: 'jean.dupont@gorfisca.com',
          action: 'modify_journal_entry',
          resource_type: 'journal_entry',
          resource_id: 'JE-2026-089',
          description: 'Modification de l\'écriture comptable JE-2026-089',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'warning' as const,
          severity: 'high' as const,
          metadata: {
            old_amount: 1200000,
            new_amount: 1500000,
            reason: 'Correction d\'erreur de saisie'
          }
        },
        {
          id: 'audit_004',
          timestamp: '2026-05-21T14:15:20Z',
          user_id: 3,
          user_name: 'Paul Touré',
          user_email: 'paul.toure@gorfisca.com',
          action: 'failed_login',
          resource_type: 'auth',
          resource_id: 'session_failed',
          description: 'Tentative de connexion échouée - mot de passe incorrect',
          ip_address: '192.168.1.110',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
          status: 'failure' as const,
          severity: 'medium' as const,
          metadata: {
            attempt_count: 3,
            failure_reason: 'invalid_password'
          }
        },
        {
          id: 'audit_005',
          timestamp: '2026-05-21T14:10:10Z',
          user_id: 2,
          user_name: 'Marie Koné',
          user_email: 'marie.kone@gorfisca.com',
          action: 'export_report',
          resource_type: 'report',
          resource_id: 'balance_sheet_2026_05',
          description: 'Export du bilan mensuel en format Excel',
          ip_address: '192.168.1.105',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          status: 'success' as const,
          severity: 'low' as const,
          metadata: {
            report_type: 'balance_sheet',
            format: 'excel',
            file_size: 2048576
          }
        },
        {
          id: 'audit_006',
          timestamp: '2026-05-21T14:05:35Z',
          user_id: 1,
          user_name: 'Jean Dupont',
          user_email: 'jean.dupont@gorfisca.com',
          action: 'delete_customer',
          resource_type: 'customer',
          resource_id: 'customer_89',
          description: 'Suppression du client Customer XYZ',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success' as const,
          severity: 'high' as const,
          metadata: {
            customer_name: 'Customer XYZ',
            reason: 'Client inactif depuis 6 mois',
            backup_created: true
          }
        },
        {
          id: 'audit_007',
          timestamp: '2026-05-21T13:55:22Z',
          user_id: 4,
          user_name: 'Aminata Bamba',
          user_email: 'aminata.bamba@gorfisca.com',
          action: 'system_backup',
          resource_type: 'system',
          resource_id: 'backup_20260521_1355',
          description: 'Sauvegarde automatique du système',
          ip_address: '127.0.0.1',
          user_agent: 'Gorfisca-System/1.0',
          status: 'success' as const,
          severity: 'low' as const,
          metadata: {
            backup_type: 'automated',
            backup_size: 1073741824,
            duration: 180
          }
        },
        {
          id: 'audit_008',
          timestamp: '2026-05-21T13:45:10Z',
          user_id: 1,
          user_name: 'Jean Dupont',
          user_email: 'jean.dupont@gorfisca.com',
          action: 'integrity_check',
          resource_type: 'blockchain',
          resource_id: 'ledger_integrity',
          description: 'Vérification de l\'intégrité de la chaîne blockchain',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success' as const,
          severity: 'medium' as const,
          metadata: {
            blocks_verified: 1247,
            integrity_status: 'valid',
            check_duration: 45
          }
        }
      ] as AuditLogEntry[]
    },
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000
  })

  // Fetch users for filter
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      return [
        { id: 1, name: 'Jean Dupont', email: 'jean.dupont@gorfisca.com', role: 'admin' },
        { id: 2, name: 'Marie Koné', email: 'marie.kone@gorfisca.com', role: 'accountant' },
        { id: 3, name: 'Paul Touré', email: 'paul.toure@gorfisca.com', role: 'user' },
        { id: 4, name: 'Aminata Bamba', email: 'aminata.bamba@gorfisca.com', role: 'admin' }
      ] as User[]
    },
    staleTime: 5 * 60 * 1000
  })

  // Filter audit logs
  const filteredLogs = useMemo(() => {
    if (!auditLogs) return []

    return auditLogs.filter(log => {
      const matchesSearch = searchTerm === '' || 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address.includes(searchTerm)

      const matchesUser = selectedUser === 'all' || log.user_id.toString() === selectedUser
      const matchesAction = selectedAction === 'all' || log.action === selectedAction
      const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus
      const matchesSeverity = selectedSeverity === 'all' || log.severity === selectedSeverity

      return matchesSearch && matchesUser && matchesAction && matchesStatus && matchesSeverity
    })
  }, [auditLogs, searchTerm, selectedUser, selectedAction, selectedStatus, selectedSeverity])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />
      case 'failure':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">{t('success')}</Badge>
      case 'failure':
        return <Badge variant="error">{t('failure')}</Badge>
      case 'warning':
        return <Badge variant="warning">{t('warning')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="error" className="text-xs">{t('critical')}</Badge>
      case 'high':
        return <Badge variant="error" className="text-xs">{t('high')}</Badge>
      case 'medium':
        return <Badge variant="warning" className="text-xs">{t('medium')}</Badge>
      case 'low':
        return <Badge variant="success" className="text-xs">{t('low')}</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">{severity}</Badge>
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
      case 'failed_login':
        return <User className="w-4 h-4" />
      case 'create_invoice':
      case 'modify_journal_entry':
      case 'delete_customer':
        return <FileText className="w-4 h-4" />
      case 'export_report':
        return <Download className="w-4 h-4" />
      case 'system_backup':
        return <Settings className="w-4 h-4" />
      case 'integrity_check':
        return <Shield className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('iPhone') || userAgent.includes('Android')) {
      return <Smartphone className="w-3 h-3" />
    } else if (userAgent.includes('Windows') || userAgent.includes('Macintosh') || userAgent.includes('Linux')) {
      return <Monitor className="w-3 h-3" />
    } else {
      return <Globe className="w-3 h-3" />
    }
  }

  // Define columns for DataTable
  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      title: t('timestamp'),
      sortable: true,
      render: (log) => (
        <div className="text-sm">
          <div className="font-medium text-on-surface">
            {format(new Date(log.timestamp), 'dd MMM yyyy HH:mm:ss', { locale: fr })}
          </div>
          <div className="text-xs text-on-surface-variant">
            {format(new Date(log.timestamp), 'relative', { locale: fr })}
          </div>
        </div>
      )
    },
    {
      key: 'user',
      title: t('user'),
      render: (log) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {log.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <div className="font-medium text-on-surface text-sm">{log.user_name}</div>
            <div className="text-xs text-on-surface-variant">{log.user_email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'action',
      title: t('action'),
      render: (log) => (
        <div className="flex items-center gap-2">
          {getActionIcon(log.action)}
          <span className="text-sm text-on-surface">{log.description}</span>
        </div>
      )
    },
    {
      key: 'status',
      title: t('status'),
      render: (log) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(log.status)}
          {getStatusBadge(log.status)}
        </div>
      )
    },
    {
      key: 'severity',
      title: t('severity'),
      render: (log) => getSeverityBadge(log.severity)
    },
    {
      key: 'details',
      title: t('details'),
      render: (log) => (
        <div className="text-xs text-on-surface-variant">
          <div className="flex items-center gap-1 mb-1">
            <Globe className="w-3 h-3" />
            <span>{log.ip_address}</span>
          </div>
          <div className="flex items-center gap-1">
            {getDeviceIcon(log.user_agent)}
            <span className="truncate max-w-32">
              {log.user_agent.split(' ')[0]}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      title: t('actions'),
      render: (log) => (
        <DataTableRowActions>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="w-4 h-4 mr-2" />
                {t('view_details')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                {t('export_log')}
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
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <Card className="p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </Card>

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
        <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          {t('error_loading_audit_log')}
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
            {t('audit_log')}
          </h1>
          <p className="text-on-surface-variant">
            {t('audit_log_description')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t('export_all')}
          </Button>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('successful_actions')}</p>
              <p className="text-lg font-semibold text-emerald-600">
                {filteredLogs.filter(log => log.status === 'success').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('failed_actions')}</p>
              <p className="text-lg font-semibold text-error">
                {filteredLogs.filter(log => log.status === 'failure').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('warnings')}</p>
              <p className="text-lg font-semibold text-amber-600">
                {filteredLogs.filter(log => log.status === 'warning').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('critical_events')}</p>
              <p className="text-lg font-semibold text-purple-600">
                {filteredLogs.filter(log => log.severity === 'critical').length}
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
                placeholder={t('search_audit_log')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_users')}</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_actions')}</SelectItem>
                <SelectItem value="login">{t('login')}</SelectItem>
                <SelectItem value="create_invoice">{t('create_invoice')}</SelectItem>
                <SelectItem value="modify_journal_entry">{t('modify_journal_entry')}</SelectItem>
                <SelectItem value="export_report">{t('export_report')}</SelectItem>
                <SelectItem value="system_backup">{t('system_backup')}</SelectItem>
                <SelectItem value="integrity_check">{t('integrity_check')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_status')}</SelectItem>
                <SelectItem value="success">{t('success')}</SelectItem>
                <SelectItem value="failure">{t('failure')}</SelectItem>
                <SelectItem value="warning">{t('warning')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_severity')}</SelectItem>
                <SelectItem value="critical">{t('critical')}</SelectItem>
                <SelectItem value="high">{t('high')}</SelectItem>
                <SelectItem value="medium">{t('medium')}</SelectItem>
                <SelectItem value="low">{t('low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">{t('last_24_hours')}</SelectItem>
                <SelectItem value="7d">{t('last_7_days')}</SelectItem>
                <SelectItem value="30d">{t('last_30_days')}</SelectItem>
                <SelectItem value="90d">{t('last_90_days')}</SelectItem>
                <SelectItem value="custom">{t('custom_range')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="flex gap-4 items-center mt-4">
            <div>
              <label className="text-sm text-on-surface-variant">{t('start_date')}</label>
              <Input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-on-surface-variant">{t('end_date')}</label>
              <Input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Audit Log Table */}
      <Card className="p-6">
        <DataTable
          data={filteredLogs}
          columns={columns}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalItems: filteredLogs.length,
            pageSize: 25,
            onPageChange: (page) => console.log('Page changed to:', page),
            onPageSizeChange: (pageSize) => console.log('Page size changed to:', pageSize)
          }}
          emptyState={{
            icon: Search,
            title: t('no_audit_logs_found'),
            description: t('no_audit_logs_description'),
            action: {
              label: t('clear_filters'),
              onClick: () => {
                setSearchTerm('')
                setSelectedUser('all')
                setSelectedAction('all')
                setSelectedStatus('all')
                setSelectedSeverity('all')
                setDateRange('7d')
              }
            }
          }}
        />
      </Card>
    </div>
  )
}
