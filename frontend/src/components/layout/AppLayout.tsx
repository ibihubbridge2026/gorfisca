import React from 'react'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 ml-72">
        <Navbar />
        
        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
