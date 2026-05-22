'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Plus, 
  Trash2, 
  Eye,
  Download,
  Mail,
  Smartphone,
  Calculator,
  User,
  Calendar,
  Building2,
  Settings,
  ArrowRight
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  total: number
}

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address: string
  tax_id: string
}

interface InvoiceData {
  customer_id: number
  invoice_date: string
  due_date: string
  reference: string
  notes: string
  template: 'modern' | 'classic'
  items: InvoiceItem[]
  subtotal: number
  tax_total: number
  total: number
}

export default function InvoiceCreatePage() {
  const t = useTranslations('invoicing')
  const queryClient = useQueryClient()

  // Form state
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    customer_id: 0,
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    reference: '',
    notes: '',
    template: 'modern',
    items: [
      {
        id: '1',
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 18,
        total: 0
      }
    ],
    subtotal: 0,
    tax_total: 0,
    total: 0
  })

  const [selectedTemplate, setSelectedTemplate] = useState<'modern' | 'classic'>('modern')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Fetch customers
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      // Mock data - replace with actual API
      return [
        {
          id: 1,
          name: 'Société ABC',
          email: 'contact@abc.com',
          phone: '+225 20 22 33 44',
          address: 'Abidjan, Cocody, Rue des Princes',
          tax_id: 'CI123456789'
        },
        {
          id: 2,
          name: 'Entreprise XYZ',
          email: 'facturation@xyz.com',
          phone: '+225 20 33 44 55',
          address: 'Abidjan, Plateau, Avenue de la République',
          tax_id: 'CI987654321'
        }
      ]
    },
    staleTime: 5 * 60 * 1000
  })

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceData) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true, invoiceId: Date.now() }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      // Redirect to invoices list
      window.location.href = '/(dashboard)/invoicing/invoices'
    }
  })

  // Calculate totals
  useEffect(() => {
    const subtotal = invoiceData.items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    )
    
    const taxTotal = invoiceData.items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price * item.tax_rate / 100), 0
    )
    
    const total = subtotal + taxTotal

    setInvoiceData(prev => ({
      ...prev,
      subtotal,
      tax_total: taxTotal,
      total
    }))
  }, [invoiceData.items])

  // Add item
  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 18,
      total: 0
    }
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  // Update item
  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          // Recalculate item total
          updatedItem.total = updatedItem.quantity * updatedItem.unit_price
          return updatedItem
        }
        return item
      })
    }))
  }

  // Remove item
  const removeItem = (id: string) => {
    if (invoiceData.items.length > 1) {
      setInvoiceData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }))
    }
  }

  // Generate PDF
  const generatePDF = async () => {
    setIsGeneratingPDF(true)
    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsGeneratingPDF(false)
  }

  // Send email
  const sendEmail = async () => {
    // Simulate email sending
    console.log('Sending invoice by email...')
  }

  // Generate payment link
  const generatePaymentLink = async () => {
    // Simulate payment link generation
    console.log('Generating Mobile Money payment link...')
  }

  // Loading state
  if (customersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>
          </Card>
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
            {t('create_invoice')}
          </h1>
          <p className="text-on-surface-variant">
            {t('create_invoice_description')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={generatePDF} disabled={isGeneratingPDF}>
            <Download className="w-4 h-4 mr-2" />
            {isGeneratingPDF ? t('generating') : t('preview_pdf')}
          </Button>
          <Button onClick={() => createInvoiceMutation.mutate(invoiceData)} disabled={createInvoiceMutation.isPending}>
            {createInvoiceMutation.isPending ? t('saving') : t('save_invoice')}
          </Button>
        </div>
      </div>

      {/* Split-Screen Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Invoice Form */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-6">
            {t('invoice_details')}
          </h2>

          <div className="space-y-6">
            {/* Customer Selection */}
            <div>
              <Label htmlFor="customer">{t('customer')}</Label>
              <Select
                value={invoiceData.customer_id.toString()}
                onValueChange={(value) => setInvoiceData(prev => ({ ...prev, customer_id: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_customer')} />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-on-surface-variant">{customer.email}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice_date">{t('invoice_date')}</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={invoiceData.invoice_date}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoice_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="due_date">{t('due_date')}</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={invoiceData.due_date}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Reference */}
            <div>
              <Label htmlFor="reference">{t('reference')}</Label>
              <Input
                id="reference"
                value={invoiceData.reference}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder={t('reference_placeholder')}
              />
            </div>

            {/* Template Selection */}
            <div>
              <Label>{t('template')}</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={selectedTemplate === 'modern' ? 'default' : 'outline'}
                  onClick={() => setSelectedTemplate('modern')}
                  className="h-20 flex flex-col"
                >
                  <FileText className="w-6 h-6 mb-2" />
                  <span className="text-sm">{t('modern_template')}</span>
                </Button>
                <Button
                  variant={selectedTemplate === 'classic' ? 'default' : 'outline'}
                  onClick={() => setSelectedTemplate('classic')}
                  className="h-20 flex flex-col"
                >
                  <FileText className="w-6 h-6 mb-2" />
                  <span className="text-sm">{t('classic_template')}</span>
                </Button>
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>{t('items')}</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('add_item')}
                </Button>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {invoiceData.items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border border-surface-container-low rounded-lg"
                    >
                      <div className="grid grid-cols-12 gap-2 items-start">
                        {/* Description */}
                        <div className="col-span-6">
                          <Input
                            placeholder={t('description')}
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          />
                        </div>

                        {/* Quantity */}
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Qté"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            min="1"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Prix"
                            value={item.unit_price || ''}
                            onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            disabled={invoiceData.items.length === 1}
                            className="text-error hover:text-error hover:bg-error-container/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-on-surface-variant">
                          {t('item_total')}: {(item.quantity * item.unit_price).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                        </span>
                        <Select
                          value={item.tax_rate.toString()}
                          onValueChange={(value) => updateItem(item.id, 'tax_rate', parseFloat(value))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="18">18%</SelectItem>
                            <SelectItem value="9">9%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea
                id="notes"
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('notes_placeholder')}
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Right: Live Preview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-on-surface">
              {t('live_preview')}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={sendEmail}>
                <Mail className="w-4 h-4 mr-2" />
                {t('send_email')}
              </Button>
              <Button variant="outline" size="sm" onClick={generatePaymentLink}>
                <Smartphone className="w-4 h-4 mr-2" />
                {t('payment_link')}
              </Button>
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="bg-white border border-surface-container-low rounded-lg p-8">
            {/* Invoice Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-on-surface">
                  {t('invoice')}
                </h3>
                <p className="text-on-surface-variant">
                  {invoiceData.reference || t('auto_generated')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-on-surface-variant">
                  {t('invoice_date')}
                </p>
                <p className="font-medium text-on-surface">
                  {format(new Date(invoiceData.invoice_date), 'dd MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-sm text-on-surface-variant mt-2">
                  {t('due_date')}
                </p>
                <p className="font-medium text-on-surface">
                  {format(new Date(invoiceData.due_date), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            {invoiceData.customer_id > 0 && (
              <div className="mb-8">
                <h4 className="font-semibold text-on-surface mb-2">
                  {t('bill_to')}
                </h4>
                <div className="text-sm text-on-surface-variant">
                  <p>{customers?.find(c => c.id === invoiceData.customer_id)?.name}</p>
                  <p>{customers?.find(c => c.id === invoiceData.customer_id)?.address}</p>
                  <p>{customers?.find(c => c.id === invoiceData.customer_id)?.email}</p>
                  <p>{customers?.find(c => c.id === invoiceData.customer_id)?.phone}</p>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-container-low">
                    <th className="text-left py-2 text-sm font-medium text-on-surface">
                      {t('description')}
                    </th>
                    <th className="text-center py-2 text-sm font-medium text-on-surface">
                      {t('quantity')}
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-on-surface">
                      {t('unit_price')}
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-on-surface">
                      {t('total')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item) => (
                    <tr key={item.id} className="border-b border-surface-container-low">
                      <td className="py-3 text-sm text-on-surface">
                        {item.description || '-'}
                      </td>
                      <td className="py-3 text-center text-sm text-on-surface">
                        {item.quantity}
                      </td>
                      <td className="py-3 text-right text-sm text-on-surface">
                        {item.unit_price.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                      </td>
                      <td className="py-3 text-right text-sm text-on-surface">
                        {(item.quantity * item.unit_price).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('subtotal')}</span>
                <span className="font-medium text-on-surface">
                  {invoiceData.subtotal.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('tax')}</span>
                <span className="font-medium text-on-surface">
                  {invoiceData.tax_total.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold text-on-surface">{t('total')}</span>
                <span className="font-bold text-lg text-on-surface">
                  {invoiceData.total.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </span>
              </div>
            </div>

            {/* Notes */}
            {invoiceData.notes && (
              <div className="mt-8 pt-8 border-t border-surface-container-low">
                <h4 className="font-semibold text-on-surface mb-2">
                  {t('notes')}
                </h4>
                <p className="text-sm text-on-surface-variant">
                  {invoiceData.notes}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4">
        <Button variant="outline" asChild>
          <a href="/(dashboard)/invoicing/invoices">
            {t('cancel')}
          </a>
        </Button>
        <Button onClick={() => createInvoiceMutation.mutate(invoiceData)} disabled={createInvoiceMutation.isPending}>
          {createInvoiceMutation.isPending ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('saving')}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {t('save_invoice')}
            </div>
          )}
        </Button>
      </div>
    </div>
  )
}
