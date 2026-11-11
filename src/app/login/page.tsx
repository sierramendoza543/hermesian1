'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { friendlyAuthError, useAuth } from '@/contexts/AuthContext'
import AuthShell from '@/components/ui/AuthShell'
import Notice from '@/components/ui/Notice'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, resetPassword, authAvailable } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get('from')
  const dest = from && from.startsWith('/') && !from.startsWith('//') ? from : '/profile'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await signIn(email, password)
      router.push(dest)
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const forgot = async () => {
    setError('')
    setInfo('')
    if (!email.trim()) return setError('Enter your email above first, then click “Forgot password?”.')
    try {
      await resetPassword(email)
      setInfo('Password reset email sent - check your inbox (and spam).')
    } catch (err) {
      setError(friendlyAuthError(err))
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to save stories, analyses and game scores."
      footer={<>New here? <Link href="/signup" className="font-semibold text-primary hover:underline">Create an account</Link></>}
    >
      {!authAvailable && <div className="mb-4"><Notice tone="warn">Accounts aren&apos;t configured on this deployment yet.</Notice></div>}
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice>{info}</Notice>}
        <div>
          <label htmlFor="email" className="label-mono mb-1.5 block">Email</label>
          <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="label-mono">Password</label>
            <button type="button" onClick={forgot} className="text-xs font-medium text-primary hover:underline">Forgot password?</button>
          </div>
          <input id="password" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading || !authAvailable} className="btn-primary w-full">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
      </form>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
