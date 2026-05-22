import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Download, 
  GitBranch, 
  BookOpen, 
  Brain, 
  Settings,
  User 
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  accountant: 'Comptable',
  viewer: 'Lecteur',
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname()
  const t = useTranslations('navigation')
  const { user } = useAuth()

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Utilisateur'
  const displayRole = user?.role ? (ROLE_LABELS[user.role] || user.role) : '—'

  const navigation = [
    { name: 'Tableau de Bord', href: '/fr/dashboard', icon: Home },
    { name: 'Raffinerie & Imports', href: '/fr/imports', icon: Download },
    { name: 'Hub de Réconciliation', href: '/fr/reconciliation', icon: GitBranch },
    { name: 'Grand Livre & OHADA', href: '/fr/accounting', icon: BookOpen },
    { name: 'Intelligence & Rapports', href: '/fr/reports', icon: Brain },
    { name: 'Paramètres', href: '/fr/settings', icon: Settings },
  ]

  return (
    <aside className="flex flex-col w-72 h-screen p-6 fixed left-0 top-0 bg-[#0F172A] z-50 rounded-r-lg">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 px-4">
        <Logo size="lg" />
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
                  ? 'bg-emerald-500 text-white rounded-[24px] px-4 py-3 translate-x-1 duration-300 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-emerald-500/20 transition-all rounded-[24px]'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-body tracking-wide text-sm font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Profile - Bottom */}
      <div className="mt-auto">
        <div className="bg-slate-800/50 rounded-lg p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-white font-medium text-sm truncate" title={displayName}>{displayName}</div>
            <div className="text-slate-400 text-xs">{displayRole}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
