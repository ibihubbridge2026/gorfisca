'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Spinner, LoadingCard } from '@/components/ui/Spinner'
import { 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  FileText, 
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Calculator,
  CheckCircle
} from 'lucide-react'
import invoicingService, { InvoiceCreateData, InvoiceItem } from '@/services/api/invoicing.service'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function CreateInvoicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [taxConfig, setTaxConfig] = useState<any>(null)
  const [revenueAccounts, setRevenueAccounts] = useState<Array<{id: string, code: string, label: string}>>([])
  const [error, setError] = useState<string | null>(null)
  
  // Invoice form data
  const [invoiceData, setInvoiceData] = useState<InvoiceCreateData>({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_terms: 'net_30',
    notes: '',
    items: [
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        revenue_account: '',
        tax_rate: 18
      }
    ]
  })

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [taxData, accountsData] = await Promise.all([
          invoicingService.getTaxConfiguration(),
          invoicingService.fetchRevenueAccounts()
        ])
        setTaxConfig(taxData)
        setRevenueAccounts(accountsData)
        
        // Set default tax rate for first item
        if (taxData && invoiceData.items.length > 0) {
          setInvoiceData(prev => ({
            ...prev,
            items: prev.items.map(item => ({
              ...item,
              tax_rate: taxData.default_tax_rate
            }))
          }))
        }
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Erreur lors du chargement des données')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0
    let taxAmount = 0
    let total = 0

    invoiceData.items.forEach(item => {
      const itemSubtotal = item.quantity * item.unit_price
      const itemTaxAmount = itemSubtotal * (item.tax_rate / 100)
      const itemTotal = itemSubtotal + itemTaxAmount
      
      subtotal += itemSubtotal
      taxAmount += itemTaxAmount
      total += itemTotal
    })

    return { subtotal, taxAmount, total }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  // Update due date based on payment terms
  const updateDueDate = (paymentTerms: string) => {
    const issueDate = new Date(invoiceData.issue_date)
    let daysToAdd = 30

    switch (paymentTerms) {
      case 'immediate':
        daysToAdd = 0
        break
      case 'net_15':
        daysToAdd = 15
        break
      case 'net_30':
        daysToAdd = 30
        break
      case 'net_60':
        daysToAdd = 60
        break
      case 'net_90':
        daysToAdd = 90
        break
    }

    const dueDate = new Date(issueDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    setInvoiceData(prev => ({
      ...prev,
      payment_terms: paymentTerms as any,
      due_date: dueDate.toISOString().split('T')[0]
    }))
  }

  // Add new item
  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, {
        description: '',
        quantity: 1,
        unit_price: 0,
        revenue_account: '',
        tax_rate: taxConfig?.default_tax_rate || 18
      }]
    }))
  }

  // Remove item
  const removeItem = (index: number) => {
    if (invoiceData.items.length > 1) {
      setInvoiceData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  // Update item
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!invoiceData.client_name.trim()) {
      setError('Le nom du client est requis')
      return
    }

    if (invoiceData.items.some(item => !item.description.trim() || item.unit_price <= 0)) {
      setError('Tous les articles doivent avoir une description et un prix unitaire valide')
      return
    }

    if (invoiceData.items.some(item => !item.revenue_account)) {
      setError('Tous les articles doivent avoir un compte de revenu associé')
      return
    }

    try {
      setSaving(true)
      const createdInvoice = await invoicingService.createInvoice(invoiceData)
      
      // Redirect to invoice detail or list
      router.push(`/invoices/${createdInvoice.id}`)
    } catch (err: any) {
      console.error('Error creating invoice:', err)
      setError(err.response?.data?.detail || 'Erreur lors de la création de la facture')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <LoadingCard title="Chargement..." />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <nav className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-primary/60 uppercase">
              <span>Sanctuary</span>
              <span className="text-[12px]">›</span>
              <span>Facturation</span>
            </nav>
            <h1 className="editorial-header text-on-surface">Créer une Nouvelle Facture</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary">
              <FileText className="w-4 h-4" />
              Sauvegarder Brouillon
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
              {saving ? 'Création...' : 'Créer la Facture'}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error-container text-error p-4 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <h2 className="section-header">Informations Client</h2>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Nom du client *
                  </label>
                  <input
                    type="text"
                    value={invoiceData.client_name}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, client_name: e.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                    placeholder="Nom de l'entreprise ou du client"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={invoiceData.client_email}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, client_email: e.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                    placeholder="email@exemple.com"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={invoiceData.client_phone}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, client_phone: e.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                    placeholder="+221 33 123 45 67"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={invoiceData.client_address}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, client_address: e.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                    placeholder="Adresse complète du client"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <h2 className="section-header">Détails de la Facture</h2>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Date d'émission
                  </label>
                  <input
                    type="date"
                    value={invoiceData.issue_date}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    value={invoiceData.due_date}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Conditions de paiement
                  </label>
                  <select
                    value={invoiceData.payment_terms}
                    onChange={(e) => updateDueDate(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  >
                    <option value="immediate">Paiement immédiat</option>
                    <option value="net_15">Net 15 jours</option>
                    <option value="net_30">Net 30 jours</option>
                    <option value="net_60">Net 60 jours</option>
                    <option value="net_90">Net 90 jours</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Notes
                </label>
                <textarea
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  rows={3}
                  placeholder="Notes ou conditions supplémentaires..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="section-header">Articles de la Facture</h2>
                <Button variant="secondary" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4" />
                  Ajouter un article
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoiceData.items.map((item, index) => (
                <div key={index} className="p-4 bg-surface-container-low rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-on-surface">Article {index + 1}</h3>
                    {invoiceData.items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full bg-surface border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                        placeholder="Description de l'article ou service"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        Quantité
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full bg-surface border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        Prix unitaire HT *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full bg-surface border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        Compte de revenu *
                      </label>
                      <select
                        value={item.revenue_account}
                        onChange={(e) => updateItem(index, 'revenue_account', e.target.value)}
                        className="w-full bg-surface border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                        required
                      >
                        <option value="">Sélectionner un compte</option>
                        {revenueAccounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        TVA (%)
                      </label>
                      <select
                        value={item.tax_rate}
                        onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value))}
                        className="w-full bg-surface border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                      >
                        <option value="0">Exonéré</option>
                        <option value="0">0%</option>
                        <option value="18">18% (Normal)</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Item totals */}
                  <div className="flex justify-between text-sm pt-2 border-t border-surface-container">
                    <span className="text-on-surface-variant">Sous-total HT:</span>
                    <span className="font-medium text-on-surface">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </span>
                    <span className="text-on-surface-variant">TVA:</span>
                    <span className="font-medium text-on-surface">
                      {formatCurrency(item.quantity * item.unit_price * (item.tax_rate / 100))}
                    </span>
                    <span className="font-bold text-on-surface">Total:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency((item.quantity * item.unit_price) * (1 + item.tax_rate / 100))}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-on-surface-variant">Sous-total HT:</span>
                    <span className="font-medium text-on-surface">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-on-surface-variant">TVA ({taxConfig?.tax_name || 'TVA'}):</span>
                    <span className="font-medium text-on-surface">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex items-center gap-4 pt-2 border-t border-surface-container">
                    <span className="font-bold text-on-surface">Total TTC:</span>
                    <span className="font-bold text-xl text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button variant="secondary" type="button">
                    <FileText className="w-4 h-4" />
                    Aperçu PDF
                  </Button>
                  <Button variant="primary" type="submit" disabled={saving}>
                    {saving ? <Spinner size="sm" /> : <CheckCircle className="w-4 h-4" />}
                    {saving ? 'Création...' : 'Créer la Facture'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  )
}
