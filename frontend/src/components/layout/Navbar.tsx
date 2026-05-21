import React from 'react'
import { Search, Notifications, Business, Settings, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export const Navbar: React.FC = () => {
  return (
    <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 bg-surface-container-lowest/80 backdrop-blur-2xl z-40 shadow-glass-lg">
      {/* Search Bar */}
      <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-full w-96">
        <Search className="w-5 h-5 text-on-surface-variant mr-3" />
        <input 
          type="text"
          placeholder="Rechercher une transaction..."
          className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-on-surface-variant font-body"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Business className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-tertiary rounded-full ring-2 ring-surface-container-lowest"></span>
          </Button>
        </div>

        {/* Divider */}
        <div className="h-8 w-[1px] bg-outline-variant/30"></div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-6">
          <div className="text-right">
            <p className="text-sm font-bold text-on-surface">M. Diop</p>
            <p className="text-[10px] text-on-surface-variant font-medium">Administrateur</p>
          </div>
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBudIgNJ0KfDndnMOXoqBFqjyaovz2QGnJCqHi7Go5sgoeXo7qebB9ASm1wxnoZKRFjT5mIt6ODmyOhEYsJOizZm2Vfws_OvGA79lF83ptq0--nLWGOLvc9rw08remuLss3EuF1A6BTA5VSRsEYCVMtVi4jPNisT_iLkeCcgaPxikyZN485MRs3BFva0avHU2Rj7j-c_dfkJMxe77xmHM5WudSOMrtWTYxL5v9G-eveHzfV1VSLxvkhCHdEwFC0dWs8EzGEoGoyIM"
            alt="User Profile"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/10"
          />
        </div>
      </div>
    </header>
  )
}
