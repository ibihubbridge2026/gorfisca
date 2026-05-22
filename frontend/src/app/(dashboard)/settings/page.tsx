'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, 
  Receipt, 
  Users, 
  Plug,
  Upload,
  Palette,
  Save,
  Plus,
  Trash2,
  Edit,
  Shield,
  Key,
  Globe,
  CreditCard,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Zod schemas for validation
const companyProfileSchema = z.object({
  name: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  legal_form: z.string().min(1, 'La forme juridique est requise'),
  tax_id: z.string().min(1, 'L\'identifiant fiscal est requis'),
  address: z.string().min(1, 'L\'adresse est requise'),
  phone: z.string().min(1, 'Le téléphone est requis'),
  email: z.string().email('L\'email doit être valide'),
  website: z.string().url('L\'URL du site web doit être valide').optional().or(z.literal('')),
  description: z.string().optional()
})

const taxSettingsSchema = z.object({
  vat_rate: z.number().min(0).max(100),
  tax_regime: z.enum(['OHADA', 'Simplified', 'Micro']),
  default_currency: z.string().min(3, 'La devise doit avoir au moins 3 caractères'),
  fiscal_year_start: z.string(),
  tax_number: z.string().min(1, 'Le numéro d\'identification fiscale est requis'),
  tax_authority: z.string().min(1, 'L\'autorité fiscale est requise')
})

const userSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('L\'email doit être valide'),
  role: z.enum(['admin', 'accountant', 'agent']),
  department: z.string().optional()
})

type CompanyProfileForm = z.infer<typeof companyProfileSchema>
type TaxSettingsForm = z.infer<typeof taxSettingsSchema>
type UserForm = z.infer<typeof userSchema>

interface CompanyProfile {
  id: number
  name: string
  legal_form: string
  tax_id: string
  address: string
  phone: string
  email: string
  website: string
  description: string
  logo_url?: string
  created_at: string
  updated_at: string
}

interface TaxSettings {
  id: number
  vat_rate: number
  tax_regime: 'OHADA' | 'Simplified' | 'Micro'
  default_currency: string
  fiscal_year_start: string
  tax_number: string
  tax_authority: string
  auto_vat_calculation: boolean
  tax_reporting_frequency: 'monthly' | 'quarterly' | 'annually'
}

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'accountant' | 'agent'
  department?: string
  is_active: boolean
  last_login?: string
  created_at: string
  permissions: string[]
}

interface Integration {
  id: number
  name: string
  type: 'banking' | 'payment' | 'accounting' | 'crm'
  status: 'connected' | 'disconnected' | 'error'
  description: string
  last_sync?: string
  api_key?: string
  settings: Record<string, any>
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('company')
  const [isSaving, setIsSaving] = useState(false)

  // Forms
  const companyForm = useForm<CompanyProfileForm>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      name: '',
      legal_form: '',
      tax_id: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      description: ''
    }
  })

  const taxForm = useForm<TaxSettingsForm>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: {
      vat_rate: 18,
      tax_regime: 'OHADA',
      default_currency: 'XOF',
      fiscal_year_start: '01-01',
      tax_number: '',
      tax_authority: ''
    }
  })

  // Fetch data
  const { data: companyProfile, isLoading: companyLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: async () => {
      // Mock data - replace with actual API
      return {
        id: 1,
        name: 'Société Gorfisca SA',
        legal_form: 'SARL',
        tax_id: 'CI123456789',
        address: 'Abidjan, Cocody, Rue des Princes, BP 1234',
        phone: '+225 20 22 33 44',
        email: 'contact@gorfisca.com',
        website: 'https://gorfisca.com',
        description: 'Solution de gestion financière moderne pour les entreprises africaines',
        logo_url: '/logo.png',
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-05-20T14:30:00Z'
      } as CompanyProfile
    },
    staleTime: 5 * 60 * 1000
  })

  const { data: taxSettings, isLoading: taxLoading } = useQuery({
    queryKey: ['tax-settings'],
    queryFn: async () => {
      return {
        id: 1,
        vat_rate: 18,
        tax_regime: 'OHADA',
        default_currency: 'XOF',
        fiscal_year_start: '01-01',
        tax_number: 'CI987654321',
        tax_authority: 'Direction Générale des Impôts - Côte d\'Ivoire',
        auto_vat_calculation: true,
        tax_reporting_frequency: 'monthly'
      } as TaxSettings
    },
    staleTime: 5 * 60 * 1000
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      return [
        {
          id: 1,
          name: 'Jean Dupont',
          email: 'jean.dupont@gorfisca.com',
          role: 'admin' as const,
          department: 'Direction',
          is_active: true,
          last_login: '2026-05-21T14:30:00Z',
          created_at: '2026-01-15T10:00:00Z',
          permissions: ['all']
        },
        {
          id: 2,
          name: 'Marie Koné',
          email: 'marie.kone@gorfisca.com',
          role: 'accountant' as const,
          department: 'Comptabilité',
          is_active: true,
          last_login: '2026-05-21T09:15:00Z',
          created_at: '2026-02-01T14:20:00Z',
          permissions: ['accounting', 'invoicing', 'reports']
        },
        {
          id: 3,
          name: 'Paul Touré',
          email: 'paul.toure@gorfisca.com',
          role: 'agent' as const,
          department: 'Opérations',
          is_active: false,
          last_login: '2026-05-15T16:45:00Z',
          created_at: '2026-03-10T11:30:00Z',
          permissions: ['invoicing', 'banking']
        }
      ] as User[]
    },
    staleTime: 2 * 60 * 1000
  })

  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      return [
        {
          id: 1,
          name: 'Orange Money API',
          type: 'payment' as const,
          status: 'connected' as const,
          description: 'Intégration pour les paiements Mobile Money',
          last_sync: '2026-05-21T14:00:00Z',
          api_key: 'om_live_***',
          settings: {
            auto_sync: true,
            sync_frequency: 'hourly'
          }
        },
        {
          id: 2,
          name: 'Ecobank Direct',
          type: 'banking' as const,
          status: 'connected' as const,
          description: 'Connexion directe aux comptes bancaires',
          last_sync: '2026-05-21T13:30:00Z',
          api_key: 'ecobank_***',
          settings: {
            account_numbers: ['CI001234567890'],
            sync_type: 'real-time'
          }
        },
        {
          id: 3,
          name: 'Wave API',
          type: 'payment' as const,
          status: 'disconnected' as const,
          description: 'API Wave pour les transferts d\'argent',
          settings: {}
        }
      ] as Integration[]
    },
    staleTime: 2 * 60 * 1000
  })

  // Mutations
  const saveCompanyProfileMutation = useMutation({
    mutationFn: async (data: CompanyProfileForm) => {
      setIsSaving(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-profile'] })
      setIsSaving(false)
    },
    onError: () => {
      setIsSaving(false)
    }
  })

  const saveTaxSettingsMutation = useMutation({
    mutationFn: async (data: TaxSettingsForm) => {
      setIsSaving(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-settings'] })
      setIsSaving(false)
    },
    onError: () => {
      setIsSaving(false)
    }
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="error">{t('admin')}</Badge>
      case 'accountant':
        return <Badge variant="warning">{t('accountant')}</Badge>
      case 'agent':
        return <Badge variant="success">{t('agent')}</Badge>
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  const getIntegrationStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="success">{t('connected')}</Badge>
      case 'disconnected':
        return <Badge variant="secondary">{t('disconnected')}</Badge>
      case 'error':
        return <Badge variant="error">{t('error')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'banking':
        return <CreditCard className="w-4 h-4" />
      case 'payment':
        return <Globe className="w-4 h-4" />
      case 'accounting':
        return <Receipt className="w-4 h-4" />
      case 'crm':
        return <Users className="w-4 h-4" />
      default:
        return <Plug className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t('settings')}
          </h1>
          <p className="text-on-surface-variant">
            {t('settings_description')}
          </p>
        </div>
        
        <Button onClick={() => window.location.reload()}>
          <Save className="w-4 h-4 mr-2" />
          {t('save_all')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {t('company_profile')}
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            {t('tax_settings')}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('users_roles')}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="w-4 h-4" />
            {t('integrations')}
          </TabsTrigger>
        </TabsList>

        {/* Company Profile Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'company' && (
            <motion.div
              key="company"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TabsContent value="company" className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-on-surface mb-6">
                    {t('company_information')}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="company_name">{t('company_name')}</Label>
                        <Input
                          id="company_name"
                          {...companyForm.register('name')}
                          placeholder={t('company_name_placeholder')}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="legal_form">{t('legal_form')}</Label>
                        <Select {...companyForm.register('legal_form')}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_legal_form')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SARL">SARL</SelectItem>
                            <SelectItem value="SA">SA</SelectItem>
                            <SelectItem value="EURL">EURL</SelectItem>
                            <SelectItem value="SAS">SAS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="tax_id">{t('tax_id')}</Label>
                        <Input
                          id="tax_id"
                          {...companyForm.register('tax_id')}
                          placeholder={t('tax_id_placeholder')}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="company_email">{t('company_email')}</Label>
                        <Input
                          id="company_email"
                          type="email"
                          {...companyForm.register('email')}
                          placeholder={t('company_email_placeholder')}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="company_address">{t('address')}</Label>
                        <Textarea
                          id="company_address"
                          {...companyForm.register('address')}
                          placeholder={t('address_placeholder')}
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="company_phone">{t('phone')}</Label>
                        <Input
                          id="company_phone"
                          {...companyForm.register('phone')}
                          placeholder={t('phone_placeholder')}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="company_website">{t('website')}</Label>
                        <Input
                          id="company_website"
                          {...companyForm.register('website')}
                          placeholder={t('website_placeholder')}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Label htmlFor="company_description">{t('description')}</Label>
                    <Textarea
                      id="company_description"
                      {...companyForm.register('description')}
                      placeholder={t('description_placeholder')}
                      rows={3}
                    />
                  </div>
                  
                  {/* Logo Upload */}
                  <div className="mt-6">
                    <Label>{t('company_logo')}</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="w-20 h-20 bg-surface-container-low rounded-lg flex items-center justify-center">
                        {companyProfile?.logo_url ? (
                          <img src={companyProfile.logo_url} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Upload className="w-8 h-8 text-on-surface-variant" />
                        )}
                      </div>
                      <div>
                        <Button variant="outline" size="sm">
                          <Upload className="w-4 h-4 mr-2" />
                          {t('upload_logo')}
                        </Button>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {t('logo_requirements')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <Button 
                      onClick={companyForm.handleSubmit(saveCompanyProfileMutation.mutate)}
                      disabled={isSaving || saveCompanyProfileMutation.isPending}
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {t('saving')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          {t('save_company_profile')}
                        </div>
                      )}
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tax Settings Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'tax' && (
            <motion.div
              key="tax"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TabsContent value="tax" className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-on-surface mb-6">
                    {t('tax_configuration')}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="vat_rate">{t('vat_rate')} (%)</Label>
                        <Input
                          id="vat_rate"
                          type="number"
                          {...taxForm.register('vat_rate', { valueAsNumber: true })}
                          placeholder="18"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="tax_regime">{t('tax_regime')}</Label>
                        <Select {...taxForm.register('tax_regime')}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_tax_regime')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OHADA">OHADA</SelectItem>
                            <SelectItem value="Simplified">{t('simplified')}</SelectItem>
                            <SelectItem value="Micro">{t('micro')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="default_currency">{t('default_currency')}</Label>
                        <Select {...taxForm.register('default_currency')}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_currency')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="XOF">XOF - Franc CFA</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="USD">USD - Dollar US</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="fiscal_year_start">{t('fiscal_year_start')}</Label>
                        <Select {...taxForm.register('fiscal_year_start')}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_fiscal_year_start')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="01-01">1 Janvier</SelectItem>
                            <SelectItem value="04-01">1 Avril</SelectItem>
                            <SelectItem value="07-01">1 Juillet</SelectItem>
                            <SelectItem value="10-01">1 Octobre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="tax_number">{t('tax_number')}</Label>
                        <Input
                          id="tax_number"
                          {...taxForm.register('tax_number')}
                          placeholder={t('tax_number_placeholder')}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="tax_authority">{t('tax_authority')}</Label>
                        <Input
                          id="tax_authority"
                          {...taxForm.register('tax_authority')}
                          placeholder={t('tax_authority_placeholder')}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Settings */}
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto_vat_calculation">{t('auto_vat_calculation')}</Label>
                        <p className="text-sm text-on-surface-variant">
                          {t('auto_vat_calculation_description')}
                        </p>
                      </div>
                      <Switch id="auto_vat_calculation" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="tax_reporting_frequency">{t('tax_reporting_frequency')}</Label>
                        <p className="text-sm text-on-surface-variant">
                          {t('tax_reporting_frequency_description')}
                        </p>
                      </div>
                      <Select defaultValue="monthly">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">{t('monthly')}</SelectItem>
                          <SelectItem value="quarterly">{t('quarterly')}</SelectItem>
                          <SelectItem value="annually">{t('annually')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <Button 
                      onClick={taxForm.handleSubmit(saveTaxSettingsMutation.mutate)}
                      disabled={isSaving || saveTaxSettingsMutation.isPending}
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {t('saving')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          {t('save_tax_settings')}
                        </div>
                      )}
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Users & Roles Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TabsContent value="users" className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-on-surface">
                      {t('users_management')}
                    </h2>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('add_user')}
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {users?.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border border-surface-container-low rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-on-surface">{user.name}</span>
                              {getRoleBadge(user.role)}
                              {!user.is_active && <Badge variant="secondary">{t('inactive')}</Badge>}
                            </div>
                            <div className="text-sm text-on-surface-variant">{user.email}</div>
                            {user.department && (
                              <div className="text-xs text-on-surface-variant">{user.department}</div>
                            )}
                            <div className="text-xs text-on-surface-variant">
                              {t('last_login')}: {user.last_login ? 
                                format(new Date(user.last_login), 'dd MMM yyyy HH:mm', { locale: fr }) : 
                                t('never')
                              }
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-2" />
                            {t('edit')}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Shield className="w-4 h-4 mr-2" />
                            {t('permissions')}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-error">
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('delete_user')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Integrations Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'integrations' && (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TabsContent value="integrations" className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-on-surface">
                      {t('integrations_management')}
                    </h2>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('add_integration')}
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {integrations?.map((integration) => (
                      <div key={integration.id} className="flex items-center justify-between p-4 border border-surface-container-low rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-surface-container-low rounded-lg flex items-center justify-center">
                            {getIntegrationIcon(integration.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-on-surface">{integration.name}</span>
                              {getIntegrationStatusBadge(integration.status)}
                            </div>
                            <div className="text-sm text-on-surface-variant">{integration.description}</div>
                            {integration.last_sync && (
                              <div className="text-xs text-on-surface-variant">
                                {t('last_sync')}: {format(new Date(integration.last_sync), 'dd MMM yyyy HH:mm', { locale: fr })}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {integration.status === 'connected' && (
                            <Button variant="outline" size="sm">
                              <Key className="w-4 h-4 mr-2" />
                              {t('configure')}
                            </Button>
                          )}
                          {integration.status === 'disconnected' && (
                            <Button size="sm">
                              <Plug className="w-4 h-4 mr-2" />
                              {t('connect')}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Key className="w-4 h-4 mr-2" />
                                {t('manage_api_keys')}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {t('test_connection')}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-error">
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('disconnect')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Tabs>
    </div>
  )
}
