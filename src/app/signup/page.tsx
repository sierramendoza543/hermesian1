'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { friendlyAuthError, useAuth } from '@/contexts/AuthContext'
import AuthShell from '@/components/ui/AuthShell'
import Notice from '@/components/ui/Notice'

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, authAvailable } = useAuth()
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Choose a password with at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    try {
      await signUp(email, password, name)
      router.push('/profile')
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free. Save stories, analyses and scores, and build a reading streak."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></>}
    >
      {!authAvailable && <div className="mb-4"><Notice tone="warn">Accounts aren&apos;t configured on this deployment yet.</Notice></div>}
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <div>
          <label htmlFor="name" className="label-mono mb-1.5 block">Display name</label>
          <input id="name" required maxLength={40} autoComplete="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" />
        </div>
        <div>
          <label htmlFor="email" className="label-mono mb-1.5 block">Email</label>
          <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="label-mono mb-1.5 block">Password</label>
            <input id="password" type="password" required autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label htmlFor="confirm" className="label-mono mb-1.5 block">Confirm</label>
            <input id="confirm" type="password" required autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <button type="submit" disabled={loading || !authAvailable} className="btn-primary w-full">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
        </button>
      </form>
    </AuthShell>
  )
}
