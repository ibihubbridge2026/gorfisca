'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { 
  FileText, 
  Plus, 
  BookOpen, 
  Search,
  Hash,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations('accounting')
  const pathname = usePathname()

  const navigation = [
    {
      name: t('journal'),
      href: '/(dashboard)/accounting/journal',
      icon: FileText,
      current: pathname === '/(dashboard)/accounting/journal'
    },
    {
      name: t('new_entry'),
      href: '/(dashboard)/accounting/new',
      icon: Plus,
      current: pathname === '/(dashboard)/accounting/new'
    },
    {
      name: t('chart_of_accounts'),
      href: '/(dashboard)/accounting/chart-of-accounts',
      icon: BookOpen,
      current: pathname === '/(dashboard)/accounting/chart-of-accounts'
    },
    {
      name: t('search'),
      href: '/(dashboard)/accounting/search',
      icon: Search,
      current: pathname === '/(dashboard)/accounting/search'
    },
    {
      name: t('blockchain_audit'),
      href: '/(dashboard)/accounting/blockchain',
      icon: Hash,
      current: pathname === '/(dashboard)/accounting/blockchain'
    },
    {
      name: t('analytics'),
      href: '/(dashboard)/accounting/analytics',
      icon: TrendingUp,
      current: pathname === '/(dashboard)/accounting/analytics'
    }
  ]

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-surface-container-low border-r border-surface-container-low">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-6">
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
              href="/(dashboard)/accounting/new"
              className="block w-full px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors text-center"
            >
              {t('create_entry')}
            </Link>
            <Link
              href="/(dashboard)/accounting/chart-of-accounts"
              className="block w-full px-3 py-2 bg-surface-container text-on-surface rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors text-center"
            >
              {t('view_accounts')}
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
