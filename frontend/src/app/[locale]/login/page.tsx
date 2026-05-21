'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Building } from 'lucide-react'
import authService from '@/services/api/auth.service'

export default function LoginPage() {
  const t = useTranslations()
  const authT = useTranslations('auth')
  const commonT = useTranslations('common')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await authService.login(email, password)
      router.push('/fr/accounting')
    } catch (err: any) {
      setError(err.response?.data?.detail || authT('loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center">
              <Building className="w-8 h-8 text-on-primary" />
            </div>
            <div>
              <h1 className="font-extrabold text-primary text-2xl leading-tight">Gorfisca</h1>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Financial Sanctuary</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <Card variant="glass" className="p-8">
          <CardContent className="p-0">
            <div className="text-center mb-8">
              <h2 className="section-header text-on-surface mb-2">{authT('login')}</h2>
              <p className="text-on-surface-variant text-sm">
                Accédez à votre plateforme comptable
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  {authT('email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  placeholder="email@exemple.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  {authT('password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-error-container text-error p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="default"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Connexion...' : authT('login')}
              </Button>
            </form>

            {/* Register Link (only shown if no users exist) */}
            <div className="mt-6 text-center">
              <p className="text-on-surface-variant text-sm">
                Première utilisation ?{' '}
                <Link 
                  href="/fr/register" 
                  className="text-primary hover:underline font-medium"
                >
                  {authT('register')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-on-surface-variant text-xs">
            Plateforme SaaS de comptabilité OHADA pour PME africaines
          </p>
        </div>
      </div>
    </div>
  )
}
