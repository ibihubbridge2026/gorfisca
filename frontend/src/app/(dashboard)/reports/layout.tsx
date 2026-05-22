'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { 
  BarChart3, 
  FileText, 
  TrendingUp,
  Activity,
  Shield,
  Settings,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations('reports')
  const pathname = usePathname()

  const navigation = [
    {
      name: t('dashboard'),
      href: '/(dashboard)/reports/dashboard',
      icon: BarChart3,
      current: pathname === '/(dashboard)/reports/dashboard'
    },
    {
      name: t('balance_sheet'),
      href: '/(dashboard)/reports/balance-sheet',
      icon: FileText,
      current: pathname === '/(dashboard)/reports/balance-sheet'
    },
    {
      name: t('profit_loss'),
      href: '/(dashboard)/reports/pnl',
      icon: TrendingUp,
      current: pathname === '/(dashboard)/reports/pnl'
    },
    {
      name: t('cash_flow'),
      href: '/(dashboard)/reports/cash-flow',
      icon: Activity,
      current: pathname === '/(dashboard)/reports/cash-flow'
    },
    {
      name: t('audit_log'),
      href: '/(dashboard)/reports/audit-log',
      icon: Settings,
      current: pathname === '/(dashboard)/reports/audit-log'
    },
    {
      name: t('blockchain_integrity'),
      href: '/(dashboard)/reports/integrity',
      icon: Shield,
      current: pathname === '/(dashboard)/reports/integrity'
    }
  ]

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-surface-container-low border-r border-surface-container-low">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t('module_title')}
          </h2>
          
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = item.current
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        
        {/* Quick Actions */}
        <div className="p-6 border-t border-surface-container-low">
          <h3 className="text-sm font-medium text-on-surface mb-3">
            {t('quick_actions')}
          </h3>
          <div className="space-y-2">
            <Link
              href="/(dashboard)/reports/balance-sheet"
              className="block w-full px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors text-center"
            >
              {t('view_balance_sheet')}
            </Link>
            <Link
              href="/(dashboard)/reports/pnl"
              className="block w-full px-3 py-2 bg-surface-container text-on-surface rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors text-center"
            >
              {t('view_profit_loss')}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-surface border-b border-surface-container px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-on-surface">
                {navigation.find(item => item.current)?.name || t('module_title')}
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                {navigation.find(item => item.current)?.name && 
                  t(`${navigation.find(item => item.current)?.href.split('/').pop()}_description`)
                }
              </p>
            </div>
            
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-on-surface-variant">
              <Link href="/(dashboard)/dashboard" className="hover:text-on-surface">
                {t('dashboard')}
              </Link>
              <span>/</span>
              <span className="text-on-surface">{t('module_title')}</span>
              {navigation.find(item => item.current)?.name && (
                <>
                  <span>/</span>
                  <span className="text-on-surface">
                    {navigation.find(item => item.current)?.name}
                  </span>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
