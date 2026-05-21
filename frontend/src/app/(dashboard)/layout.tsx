'use client'

import React from 'react'
import { Toaster } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AIChatAssistant } from '@/components/ai/AIChatAssistant'

export default function DashboardSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const queryClient = useQueryClient()

  // Invalidate journal-related queries every time an AI proposal is approved,
  // so the journal list and the dashboard KPIs refresh in real time.
  const handleProposalAccepted = () => {
    queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    queryClient.invalidateQueries({ queryKey: ['pending-entries'] })
  }

  return (
    <DashboardLayout>
      {children}
      {/* Floating AI Assistant available on every dashboard page */}
      <AIChatAssistant onProposalAccepted={handleProposalAccepted} />
      {/* Sonner Toaster for AI success / hash confirmation messages */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: 'bg-surface-container border-none shadow-glass',
          },
        }}
      />
    </DashboardLayout>
  )
}
