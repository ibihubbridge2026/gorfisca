import React, { useState, useRef, useEffect } from 'react'
import { Search, Bell, Cog, User, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Navbar: React.FC = () => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifMenuOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
    window.location.href = '/fr/login'
  }

  return (
    <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 bg-surface-container-lowest/80 backdrop-blur-2xl z-40 shadow-glass-lg">
      {/* Search Bar - focus subtil emerald, plus de bordure noire */}
      <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-full w-96 ring-1 ring-transparent focus-within:ring-emerald-500/40 transition-all">
        <Search className="w-5 h-5 text-on-surface-variant mr-3" />
        <input
          type="text"
          placeholder="Rechercher une transaction..."
          className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent text-sm w-full placeholder:text-on-surface-variant font-body"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={() => setIsNotifMenuOpen((v) => !v)}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-surface-container-lowest"></span>
          </Button>

          {isNotifMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
                <span className="text-xs text-slate-400">Tout marquer comme lu</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                  <Bell className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-600 font-medium">Aucune notification</p>
                  <p className="text-xs text-slate-400 mt-1">Vos alertes apparaîtront ici</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-[1px] bg-outline-variant/30"></div>

        {/* Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <ChevronDown className="w-4 h-4 text-on-surface-variant" />
          </button>

          {/* Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => {
                  window.location.href = '/fr/settings'
                  setIsProfileMenuOpen(false)
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <Cog className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-900">Paramètres</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-red-50 transition-colors border-t border-slate-100"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-600">Déconnexion</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
