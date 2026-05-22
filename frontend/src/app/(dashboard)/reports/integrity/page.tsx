'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  Activity,
  Zap,
  Lock,
  Unlock,
  Hash,
  Link,
  Calendar,
  MoreHorizontal,
  Play,
  Pause,
  Settings
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'

interface BlockchainBlock {
  id: number
  block_number: number
  hash: string
  previous_hash: string
  timestamp: string
  entry_count: number
  status: 'valid' | 'corrupted' | 'orphaned'
  integrity_score: number
  verification_time: number
  metadata: {
    user_id?: number
    user_name?: string
    entry_type?: string
    total_amount?: number
  }
}

interface IntegrityReport {
  total_blocks: number
  valid_blocks: number
  corrupted_blocks: number
  orphaned_blocks: number
  overall_integrity_score: number
  last_verification: string
  verification_duration: number
  chain_health: 'healthy' | 'warning' | 'critical'
  blocks: BlockchainBlock[]
}

export default function IntegrityPage() {
  const t = useTranslations('reports')
  const queryClient = useQueryClient()
  
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Fetch integrity report
  const { data: integrityReport, isLoading, error } = useQuery({
    queryKey: ['integrity-report'],
    queryFn: async () => {
      // Mock data - replace with actual API
      return {
        total_blocks: 1247,
        valid_blocks: 1245,
        corrupted_blocks: 2,
        orphaned_blocks: 0,
        overall_integrity_score: 99.84,
        last_verification: '2026-05-21T14:30:00Z',
        verification_duration: 45,
        chain_health: 'healthy',
        blocks: [
          {
            id: 1,
            block_number: 1247,
            hash: '0x7a8f9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
            previous_hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
            timestamp: '2026-05-21T14:30:00Z',
            entry_count: 3,
            status: 'valid' as const,
            integrity_score: 100,
            verification_time: 0.045,
            metadata: {
              user_id: 1,
              user_name: 'Jean Dupont',
              entry_type: 'journal_entry',
              total_amount: 1500000
            }
          },
          {
            id: 2,
            block_number: 1246,
            hash: '0x9b8c7d6e5f4a3b2c1d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
            previous_hash: '0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
            timestamp: '2026-05-21T14:25:15Z',
            entry_count: 2,
            status: 'valid' as const,
            integrity_score: 100,
            verification_time: 0.032,
            metadata: {
              user_id: 2,
              user_name: 'Marie Koné',
              entry_type: 'invoice',
              total_amount: 850000
            }
          },
          {
            id: 3,
            block_number: 1245,
            hash: '0x3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d',
            previous_hash: '0x3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
            timestamp: '2026-05-21T14:20:30Z',
            entry_count: 1,
            status: 'corrupted' as const,
            integrity_score: 0,
            verification_time: 0.125,
            metadata: {
              user_id: 1,
              user_name: 'Jean Dupont',
              entry_type: 'journal_entry',
              total_amount: 1200000
            }
          },
          {
            id: 4,
            block_number: 1244,
            hash: '0x4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
            previous_hash: '0x4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
            timestamp: '2026-05-21T14:15:45Z',
            entry_count: 4,
            status: 'valid' as const,
            integrity_score: 100,
            verification_time: 0.067,
            metadata: {
              user_id: 3,
              user_name: 'Paul Touré',
              entry_type: 'bank_reconciliation',
              total_amount: 3200000
            }
          },
          {
            id: 5,
            block_number: 1243,
            hash: '0x5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
            previous_hash: '0x5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
            timestamp: '2026-05-21T14:10:20Z',
            entry_count: 1,
            status: 'corrupted' as const,
            integrity_score: 0,
            verification_time: 0.089,
            metadata: {
              user_id: 2,
              user_name: 'Marie Koné',
              entry_type: 'journal_entry',
              total_amount: 750000
            }
          }
        ]
      } as IntegrityReport
    },
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: autoRefresh ? 10000 : false
  })

  // Full scan mutation
  const fullScanMutation = useMutation({
    mutationFn: async () => {
      setIsScanning(true)
      setScanProgress(0)
      
      // Simulate scanning process
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setScanProgress(i)
      }
      
      setIsScanning(false)
      setScanProgress(0)
      
      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['integrity-report'] })
      
      return { success: true }
    },
    onSuccess: () => {
      // Show success notification
    },
    onError: () => {
      setIsScanning(false)
      setScanProgress(0)
    }
  })

  // Filter blocks
  const filteredBlocks = useMemo(() => {
    if (!integrityReport) return []

    return integrityReport.blocks.filter(block => {
      const matchesSearch = searchTerm === '' || 
        block.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.previous_hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.block_number.toString().includes(searchTerm)

      const matchesStatus = selectedStatus === 'all' || block.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [integrityReport, searchTerm, selectedStatus])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />
      case 'corrupted':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'orphaned':
        return <Lock className="w-5 h-5 text-amber-600" />
      default:
        return <Activity className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge variant="success">{t('valid')}</Badge>
      case 'corrupted':
        return <Badge variant="error">{t('corrupted')}</Badge>
      case 'orphaned':
        return <Badge variant="warning">{t('orphaned')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'emerald'
      case 'warning':
        return 'amber'
      case 'critical':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6" />
      case 'warning':
        return <AlertTriangle className="w-6 h-6" />
      case 'critical':
        return <AlertTriangle className="w-6 h-6" />
      default:
        return <Activity className="w-6 h-6" />
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-surface-container-low rounded-lg">
                <Skeleton className="h-8 w-8" />
                <div className="flex-1 space-y-2">
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

  // Error state
  if (error) {
    return (
      <Card className="p-6 text-center">
        <Shield className="w-12 h-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          {t('error_loading_integrity')}
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
            {t('blockchain_integrity')}
          </h1>
          <p className="text-on-surface-variant">
            {t('blockchain_integrity_description')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {autoRefresh ? t('auto_refresh_on') : t('auto_refresh_off')}
          </Button>
          
          <Button
            onClick={() => fullScanMutation.mutate()}
            disabled={isScanning || fullScanMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isScanning ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('scanning')} ({scanProgress}%)
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {t('full_scan')}
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Scan Progress */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span className="text-sm font-medium text-on-surface">
                    {t('scanning_ledger')}
                  </span>
                </div>
                <span className="text-sm text-on-surface-variant">
                  {scanProgress}%
                </span>
              </div>
              <Progress value={scanProgress} className="h-2" />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 bg-${getHealthColor(integrityReport?.chain_health || 'healthy')}-100 rounded-lg flex items-center justify-center`}>
                {getHealthIcon(integrityReport?.chain_health || 'healthy')}
              </div>
              <Badge variant={integrityReport?.chain_health === 'healthy' ? 'success' : integrityReport?.chain_health === 'warning' ? 'warning' : 'error'}>
                {t(integrityReport?.chain_health || 'healthy')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('chain_health')}</p>
              <p className="text-2xl font-bold text-on-surface">
                {integrityReport?.overall_integrity_score.toFixed(2)}%
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <Badge variant="success" className="text-xs">
                {t('valid')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('valid_blocks')}</p>
              <p className="text-2xl font-bold text-emerald-600">
                {integrityReport?.valid_blocks}
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <Badge variant="error" className="text-xs">
                {t('corrupted')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('corrupted_blocks')}</p>
              <p className="text-2xl font-bold text-error">
                {integrityReport?.corrupted_blocks}
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <Badge variant="warning" className="text-xs">
                {t('orphaned')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('orphaned_blocks')}</p>
              <p className="text-2xl font-bold text-amber-600">
                {integrityReport?.orphaned_blocks}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Last Verification */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-on-surface-variant">{t('last_verification')}</p>
              <p className="font-medium text-on-surface">
                {integrityReport?.last_verification ? 
                  format(new Date(integrityReport.last_verification), 'dd MMM yyyy HH:mm:ss', { locale: fr }) : 
                  t('never')
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('verification_duration')}</p>
              <p className="font-medium text-on-surface">
                {integrityReport?.verification_duration}ms
              </p>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('total_blocks')}</p>
              <p className="font-medium text-on-surface">
                {integrityReport?.total_blocks}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              {t('export_report')}
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              {t('settings')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <Input
                type="text"
                placeholder={t('search_blocks')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_status')}</SelectItem>
                <SelectItem value="valid">{t('valid')}</SelectItem>
                <SelectItem value="corrupted">{t('corrupted')}</SelectItem>
                <SelectItem value="orphaned">{t('orphaned')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Blockchain Visualization */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-on-surface mb-6">
          {t('blockchain_visualization')}
        </h3>
        
        <div className="space-y-3">
          {filteredBlocks.map((block, index) => (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                block.status === 'valid' ? 'border-emerald-200 bg-emerald-50' :
                block.status === 'corrupted' ? 'border-red-200 bg-red-50' :
                'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(block.status)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-on-surface">
                          {t('block')} #{block.block_number}
                        </span>
                        {getStatusBadge(block.status)}
                      </div>
                      <div className="text-sm text-on-surface-variant">
                        {t('timestamp')}: {format(new Date(block.timestamp), 'dd MMM yyyy HH:mm:ss', { locale: fr })}
                      </div>
                      <div className="text-sm text-on-surface-variant">
                        {t('entries')}: {block.entry_count}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-on-surface-variant">{t('integrity_score')}</div>
                    <div className="flex items-center gap-1">
                      <Progress 
                        value={block.integrity_score} 
                        className="w-16 h-2"
                      />
                      <span className="text-sm font-medium text-on-surface">
                        {block.integrity_score}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-on-surface-variant">{t('verification_time')}</div>
                    <div className="text-sm font-medium text-on-surface">
                      {block.verification_time}ms
                    </div>
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
                        {t('view_details')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Hash className="w-4 h-4 mr-2" />
                        {t('verify_hash')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link className="w-4 h-4 mr-2" />
                        {t('view_chain')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Hash Details */}
              <div className="mt-4 pt-4 border-t border-surface-container-low/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-on-surface-variant">{t('current_hash')}:</span>
                    <div className="font-mono text-on-surface break-all mt-1">
                      {block.hash}
                    </div>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">{t('previous_hash')}:</span>
                    <div className="font-mono text-on-surface break-all mt-1">
                      {block.previous_hash}
                    </div>
                  </div>
                </div>
                
                {block.metadata && (
                  <div className="mt-3 text-xs text-on-surface-variant">
                    <span className="font-medium text-on-surface">{t('metadata')}:</span>
                    <div className="mt-1 space-y-1">
                      {block.metadata.user_name && (
                        <div>{t('user')}: {block.metadata.user_name}</div>
                      )}
                      {block.metadata.entry_type && (
                        <div>{t('entry_type')}: {block.metadata.entry_type}</div>
                      )}
                      {block.metadata.total_amount && (
                        <div>{t('amount')}: {block.metadata.total_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Success Notification */}
      <AnimatePresence>
        {fullScanMutation.isSuccess && !isScanning && (
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
                    {t('scan_completed')}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {t('scan_completed_description')}
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
