import React from 'react'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 ml-72 min-h-screen">
        <Navbar />
        
        {/* Page Content */}
        <div className="p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
