import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { 
  Dashboard, 
  Payments, 
  AccountBalance, 
  MenuBook, 
  AccountTree, 
  Assessment, 
  Settings,
  AddCircle 
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const Sidebar: React.FC = () => {
  const pathname = usePathname()
  const t = useTranslations('navigation')

  const navigation = [
    { name: t('dashboard'), href: '/fr/dashboard', icon: Dashboard },
    { name: 'Ventes', href: '/fr/sales', icon: Payments },
    { name: 'Trésorerie', href: '/fr/treasury', icon: AccountBalance },
    { name: t('accounting'), href: '/fr/accounting', icon: MenuBook },
    { name: t('reconciliation'), href: '/fr/reconciliation', icon: AccountTree },
    { name: t('reports'), href: '/fr/reports', icon: Assessment },
    { name: t('settings'), href: '/fr/settings', icon: Settings },
  ]

  return (
    <aside className="flex flex-col w-72 h-screen p-6 fixed left-0 top-0 bg-surface border-r-0 font-headline tracking-tight z-50 rounded-r-lg">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 px-4">
        <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
          <AccountBalance className="w-6 h-6 text-on-primary" />
        </div>
        <div>
          <h2 className="font-extrabold text-primary text-lg leading-tight">Gorfisca</h2>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Financial Sanctuary</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-4 px-4 py-3 rounded-[24px] transition-all duration-200',
                isActive
                  ? 'bg-primary-container/10 text-primary font-semibold translate-x-1'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low/50'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-body tracking-wide text-sm font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* New Entry Button */}
      <div className="mt-auto">
        <Button variant="primary" className="w-full shadow-lg shadow-primary/20">
          <AddCircle className="w-5 h-5" />
          <span>Nouvelle Écriture</span>
        </Button>
      </div>
    </aside>
  )
}
