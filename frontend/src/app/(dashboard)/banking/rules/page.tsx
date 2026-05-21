'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  Pause, 
  Copy,
  Code2,
  Zap,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Filter,
  Search
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AutomationRule {
  id: number
  name: string
  description: string
  is_active: boolean
  conditions: RuleCondition[]
  actions: RuleAction[]
  priority: number
  created_at: string
  updated_at: string
  execution_count: number
  last_executed?: string
  success_rate: number
}

interface RuleCondition {
  id: string
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between'
  value: string | number
  value2?: string | number // for 'between' operator
}

interface RuleAction {
  id: string
  type: 'categorize' | 'create_entry' | 'notify' | 'flag'
  parameters: Record<string, any>
}

export default function BankingRulesPage() {
  const t = useTranslations('banking')
  const queryClient = useQueryClient()
  
  const [selectedRule, setSelectedRule] = useState<number | null>(null)
  const [isCreatingRule, setIsCreatingRule] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Fetch rules
  const { data: rules, isLoading, error } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      // Mock data - replace with actual API
      return [
        {
          id: 1,
          name: 'Loyer Mensuel',
          description: 'Catégorise automatiquement les paiements de loyer',
          is_active: true,
          conditions: [
            { id: 'c1', field: 'description', operator: 'contains', value: 'loyer' },
            { id: 'c2', field: 'amount', operator: 'between', value: 150000, value2: 200000 }
          ],
          actions: [
            { id: 'a1', type: 'categorize', parameters: { category: 'Loyer', account_code: '613000' } },
            { id: 'a2', type: 'create_entry', parameters: { account_code: '613000', description: 'Loyer mensuel' } }
          ],
          priority: 1,
          created_at: '2026-05-01T10:00:00Z',
          updated_at: '2026-05-15T14:30:00Z',
          execution_count: 5,
          last_executed: '2026-05-21T09:00:00Z',
          success_rate: 100
        },
        {
          id: 2,
          name: 'Abonnements SaaS',
          description: 'Détecte et catégorise les abonnements logiciels',
          is_active: true,
          conditions: [
            { id: 'c3', field: 'description', operator: 'contains', value: 'abonnement' },
            { id: 'c4', field: 'amount', operator: 'less_than', value: 50000 }
          ],
          actions: [
            { id: 'a3', type: 'categorize', parameters: { category: 'Services', account_code: '623000' } },
            { id: 'a4', type: 'notify', parameters: { message: 'Nouvel abonnement détecté' } }
          ],
          priority: 2,
          created_at: '2026-05-05T15:30:00Z',
          updated_at: '2026-05-18T11:20:00Z',
          execution_count: 12,
          last_executed: '2026-05-20T16:45:00Z',
          success_rate: 92
        },
        {
          id: 3,
          name: 'Transferts Internes',
          description: 'Identifie les transferts entre comptes propres',
          is_active: false,
          conditions: [
            { id: 'c5', field: 'description', operator: 'contains', value: 'transfert' },
            { id: 'c6', field: 'source', operator: 'equals', value: 'mtn_money' }
          ],
          actions: [
            { id: 'a5', type: 'flag', parameters: { flag: 'internal_transfer', color: 'blue' } }
          ],
          priority: 3,
          created_at: '2026-05-10T09:15:00Z',
          updated_at: '2026-05-10T09:15:00Z',
          execution_count: 0,
          success_rate: 0
        }
      ]
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  })

  // Toggle rule mutation
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: number; isActive: boolean }) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true, ruleId, isActive }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    }
  })

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true, ruleId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      setSelectedRule(null)
    }
  })

  const handleToggleRule = (ruleId: number, isActive: boolean) => {
    toggleRuleMutation.mutate({ ruleId, isActive })
  }

  const handleDeleteRule = (ruleId: number) => {
    if (confirm(t('confirm_delete_rule'))) {
      deleteRuleMutation.mutate(ruleId)
    }
  }

  const getFieldLabel = (field: string) => {
    const fieldLabels: Record<string, string> = {
      'description': t('description'),
      'amount': t('amount'),
      'source': t('source'),
      'date': t('date'),
      'account_name': t('account_name')
    }
    return fieldLabels[field] || field
  }

  const getOperatorLabel = (operator: string) => {
    const operatorLabels: Record<string, string> = {
      'equals': t('equals'),
      'contains': t('contains'),
      'greater_than': t('greater_than'),
      'less_than': t('less_than'),
      'between': t('between')
    }
    return operatorLabels[operator] || operator
  }

  const getActionTypeLabel = (type: string) => {
    const actionTypes: Record<string, string> = {
      'categorize': t('categorize'),
      'create_entry': t('create_entry'),
      'notify': t('notify'),
      'flag': t('flag')
    }
    return actionTypes[type] || type
  }

  // Filter rules
  const filteredRules = rules?.filter(rule => {
    const matchesSearch = searchTerm === '' || 
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && rule.is_active) ||
      (filterStatus === 'inactive' && !rule.is_active)

    return matchesSearch && matchesStatus
  }) || []

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

        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-64" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t('automation_rules')}
          </h1>
          <p className="text-on-surface-variant">
            {t('automation_rules_description')}
          </p>
        </div>
        
        <Button onClick={() => setIsCreatingRule(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('create_rule')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('active_rules')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {rules?.filter(r => r.is_active).length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('total_executions')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {rules?.reduce((sum, r) => sum + r.execution_count, 0) || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('avg_success_rate')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {rules?.length ? 
                  Math.round(rules.reduce((sum, r) => sum + r.success_rate, 0) / rules.length) : 0
                }%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Code2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('total_rules')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {rules?.length || 0}
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
                placeholder={t('search_rules')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_rules')}</SelectItem>
              <SelectItem value="active">{t('active')}</SelectItem>
              <SelectItem value="inactive">{t('inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Rules List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredRules.map((rule, index) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-6 transition-all duration-200 ${
                selectedRule === rule.id ? 'ring-2 ring-emerald-500 shadow-lg' : 'shadow-md hover:shadow-lg'
              }`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-on-surface">
                        {rule.name}
                      </h3>
                      <Badge variant={rule.is_active ? 'success' : 'secondary'}>
                        {rule.is_active ? t('active') : t('inactive')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {t('priority')} {rule.priority}
                      </Badge>
                    </div>
                    <p className="text-on-surface-variant">
                      {rule.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleRule(rule.id, !rule.is_active)}
                      disabled={toggleRuleMutation.isPending}
                    >
                      {rule.is_active ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingRule(rule)}>
                          <Edit className="w-4 h-4 mr-2" />
                          {t('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="w-4 h-4 mr-2" />
                          {t('duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-error"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* IF/THEN Structure */}
                <div className="space-y-4">
                  {/* Conditions (IF) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Code2 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">IF</span>
                    </div>
                    <div className="ml-6 space-y-2">
                      {rule.conditions.map((condition, condIndex) => (
                        <div key={condition.id} className="flex items-center gap-2 text-sm">
                          <span className="text-on-surface-variant">
                            {condIndex > 0 && 'AND'}
                          </span>
                          <span className="font-medium text-on-surface">
                            {getFieldLabel(condition.field)}
                          </span>
                          <span className="text-blue-600 font-medium">
                            {getOperatorLabel(condition.operator)}
                          </span>
                          <span className="text-on-surface">
                            {condition.operator === 'between' 
                              ? `${condition.value} ET ${condition.value2}`
                              : condition.value
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions (THEN) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowRight className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-600">THEN</span>
                    </div>
                    <div className="ml-6 space-y-2">
                      {rule.actions.map((action, actionIndex) => (
                        <div key={action.id} className="flex items-center gap-2 text-sm">
                          <span className="text-on-surface-variant">
                            {actionIndex > 0 && 'AND'}
                          </span>
                          <span className="font-medium text-emerald-600">
                            {getActionTypeLabel(action.type)}
                          </span>
                          <span className="text-on-surface">
                            {Object.entries(action.parameters).map(([key, value]) => (
                              <span key={key} className="ml-1">
                                {key}={JSON.stringify(value)}
                              </span>
                            ))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-4 border-t border-surface-container-low mt-4">
                  <div className="flex items-center gap-6 text-sm text-on-surface-variant">
                    <div className="flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      <span>{rule.execution_count} {t('executions')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>{rule.success_rate}% {t('success_rate')}</span>
                    </div>
                    {rule.last_executed && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {t('last_executed')}: {format(new Date(rule.last_executed), 'dd MMM HH:mm', { locale: fr })}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-on-surface-variant">
                    {t('created')}: {format(new Date(rule.created_at), 'dd MMM yyyy', { locale: fr })}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredRules.length === 0 && (
        <Card className="p-8 text-center">
          <Code2 className="w-12 h-12 text-on-surface-variant mx-auto mb-4" />
          <h3 className="text-lg font-medium text-on-surface mb-2">
            {t('no_rules_found')}
          </h3>
          <p className="text-on-surface-variant mb-4">
            {t('no_rules_description')}
          </p>
          <Button onClick={() => setIsCreatingRule(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('create_first_rule')}
          </Button>
        </Card>
      )}

      {/* Create/Edit Rule Modal */}
      <AnimatePresence>
        {(isCreatingRule || editingRule) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-on-surface mb-4">
                {editingRule ? t('edit_rule') : t('create_rule')}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    {t('rule_name')}
                  </label>
                  <Input placeholder={t('rule_name_placeholder')} />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    {t('description')}
                  </label>
                  <Textarea placeholder={t('rule_description_placeholder')} rows={3} />
                </div>

                {/* Conditions Builder */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    {t('conditions')} (IF)
                  </label>
                  <div className="space-y-2 p-4 border border-surface-container-low rounded-lg">
                    <div className="flex items-center gap-2">
                      <Select>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder={t('field')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="description">{t('description')}</SelectItem>
                          <SelectItem value="amount">{t('amount')}</SelectItem>
                          <SelectItem value="source">{t('source')}</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder={t('operator')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">{t('equals')}</SelectItem>
                          <SelectItem value="contains">{t('contains')}</SelectItem>
                          <SelectItem value="greater_than">{t('greater_than')}</SelectItem>
                          <SelectItem value="less_than">{t('less_than')}</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Input placeholder={t('value')} className="flex-1" />
                      
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions Builder */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    {t('actions')} (THEN)
                  </label>
                  <div className="space-y-2 p-4 border border-surface-container-low rounded-lg">
                    <div className="flex items-center gap-2">
                      <Select>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder={t('action_type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="categorize">{t('categorize')}</SelectItem>
                          <SelectItem value="create_entry">{t('create_entry')}</SelectItem>
                          <SelectItem value="notify">{t('notify')}</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Input placeholder={t('parameters')} className="flex-1" />
                      
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreatingRule(false)
                    setEditingRule(null)
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button>
                  {editingRule ? t('update_rule') : t('create_rule')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
