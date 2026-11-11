'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Edit3, Flame, LogOut, Trash2, Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Badge, GameScore, SavedAnalysis, SavedStory, UserProfile, computeBadges, deleteAnalysis, getProfile, listAnalyses, listGameScores,
  listSavedStories, unsaveStory, updateProfileName,
} from '@/lib/firebase/userData'
import { leanColor } from '@/lib/outlets'
import { signed, timeAgo } from '@/lib/format'
import { GAMES } from '@/components/games/meta'
import Skeleton from '@/components/ui/Skeleton'
import Notice from '@/components/ui/Notice'

export default function ProfilePage() {
  const { user, loading: authLoading, logout, updateDisplayName } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stories, setStories] = useState<SavedStory[]>([])
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [scores, setScores] = useState<GameScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [p, s, a, g] = await Promise.all([
        getProfile(user.uid),
        listSavedStories(user.uid),
        listAnalyses(user.uid),
        listGameScores(user.uid),
      ])
      setProfile(p)
      setStories(s)
      setAnalyses(a)
      setScores(g)
    } catch {
      setError('Could not load your data. Check your connection and that Firestore rules are published.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?from=/profile')
  }, [authLoading, user, router])

  useEffect(() => {
    load()
  }, [load])

  if (authLoading || !user) {
    return <div className="mx-auto max-w-5xl px-4 py-12"><Skeleton className="h-48" /></div>
  }

  const displayName = user.displayName || profile?.displayName || user.email?.split('@')[0] || 'Reader'
  const badges: Badge[] = computeBadges({ profile, analyses: analyses.length, saved: stories.length, scores })
  const earned = badges.filter((b) => b.earned).length
  const initials = displayName.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
  const bestByGame = (g: GameScore['game']) => scores.filter((s) => s.game === g).reduce((m, s) => Math.max(m, Math.round((s.score / s.total) * 100)), 0)
  const level = Math.floor((profile?.xp || 0) / 100) + 1

  const saveName = async () => {
    const n = nameDraft.trim()
    if (!n) return
    try {
      await updateDisplayName(n)
      await updateProfileName(user.uid, n)
      setEditing(false)
    } catch {
      setError('Could not update your name.')
    }
  }

  const openAnalysis = (a: SavedAnalysis) => {
    try {
      sessionStorage.setItem('analysis:view', a.payload)
      router.push('/analyze?view=1')
    } catch {}
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {error && <div className="mb-6"><Notice tone="error">{error}</Notice></div>}

      <section className="card flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary font-headline text-3xl font-black text-white">{initials}</div>
        <div className="flex-1">
          {editing ? (
            <div className="flex gap-2">
              <input className="input max-w-xs" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={40} autoFocus />
              <button onClick={saveName} className="btn-primary"><Check className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="font-headline text-2xl font-black md:text-3xl">{displayName}</h1>
              <button onClick={() => { setNameDraft(displayName); setEditing(true) }} className="rounded-lg p-1.5 text-muted hover:bg-accent/60" aria-label="Edit name"><Edit3 className="h-4 w-4" /></button>
            </div>
          )}
          <p className="mt-1 text-sm text-muted">{user.email}</p>
          <p className="label-mono mt-3">Level {level} · {profile?.xp || 0} XP · {earned}/{badges.length} badges</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center md:w-72">
          <div className="rounded-xl bg-paper p-3">
            <Flame className="mx-auto h-5 w-5 text-orange-500" />
            <div className="mt-1 font-headline text-2xl font-black tabular-nums">{profile?.streak || 0}</div>
            <div className="label-mono">Day streak</div>
          </div>
          <div className="rounded-xl bg-paper p-3">
            <Trophy className="mx-auto h-5 w-5 text-primary" />
            <div className="mt-1 font-headline text-2xl font-black tabular-nums">{profile?.longestStreak || 0}</div>
            <div className="label-mono">Best</div>
          </div>
          <div className="rounded-xl bg-paper p-3">
            <div className="text-lg leading-5">🎮</div>
            <div className="mt-1 font-headline text-2xl font-black tabular-nums">{scores.length}</div>
            <div className="label-mono">Games</div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="mt-6 space-y-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : (
        <>
          {/* Badges */}
          <section className="mt-6">
            <h2 className="mb-3 font-headline text-xl font-bold">Badges</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {badges.map((b) => (
                <div key={b.id} className={`card p-4 text-center ${b.earned ? '' : 'opacity-50'}`}>
                  <div className={`text-3xl ${b.earned ? '' : 'grayscale'}`}>{b.icon}</div>
                  <p className="mt-2 text-sm font-semibold">{b.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{b.description}</p>
                  <p className="label-mono mt-2">{b.earned ? 'Earned' : b.progress}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Game stats */}
          <section className="mt-8">
            <h2 className="mb-3 font-headline text-xl font-bold">Game stats</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {(Object.keys(GAMES) as (keyof typeof GAMES)[]).map((k) => (
                <div key={k} className="card p-4">
                  <p className="label-mono">{GAMES[k].title}</p>
                  <p className="mt-1 font-headline text-2xl font-black">{scores.some((s) => s.game === k) ? `${bestByGame(k)}%` : '—'}</p>
                  <p className="text-xs text-muted">best · {scores.filter((s) => s.game === k).length} played</p>
                </div>
              ))}
            </div>
            {scores.length === 0 && (
              <p className="mt-3 text-sm text-muted">No games yet. <Link href="/games" className="font-semibold text-primary hover:underline">Play one →</Link></p>
            )}
          </section>

          {/* Analyses */}
          <section className="mt-8">
            <h2 className="mb-3 font-headline text-xl font-bold">Saved analyses</h2>
            {analyses.length === 0 ? (
              <p className="text-sm text-muted">Nothing saved yet. <Link href="/analyze" className="font-semibold text-primary hover:underline">Analyze an article →</Link></p>
            ) : (
              <div className="space-y-3">
                {analyses.map((a) => (
                  <div key={a.id} className="card flex items-center gap-4 p-4">
                    <div className="w-16 shrink-0 text-center">
                      <div className="font-headline text-2xl font-black tabular-nums" style={{ color: leanColor(a.leanScore) }}>{signed(a.leanScore)}</div>
                      <div className="label-mono">{a.label}</div>
                    </div>
                    <button onClick={() => openAnalysis(a)} className="flex-1 text-left">
                      <p className="font-headline text-sm font-bold leading-snug hover:text-primary">{a.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{a.source || 'Pasted text'} · {timeAgo(a.savedAt)}</p>
                    </button>
                    <button onClick={async () => { await deleteAnalysis(user.uid, a.id); setAnalyses((x) => x.filter((y) => y.id !== a.id)) }} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Delete analysis"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Stories */}
          <section className="mt-8">
            <h2 className="mb-3 font-headline text-xl font-bold">Saved stories</h2>
            {stories.length === 0 ? (
              <p className="text-sm text-muted">No saved stories. Open any story and tap “Save story”. <Link href="/" className="font-semibold text-primary hover:underline">Browse →</Link></p>
            ) : (
              <div className="space-y-3">
                {stories.map((s) => (
                  <div key={s.id} className="card flex items-center gap-4 p-4">
                    <Link href={`/story/${s.id}`} className="flex-1">
                      <p className="font-headline text-sm font-bold leading-snug hover:text-primary">{s.headline}</p>
                      <p className="mt-0.5 text-xs text-muted">{s.category} · {s.sourceCount} outlets · saved {timeAgo(s.savedAt)}</p>
                    </Link>
                    <button onClick={async () => { await unsaveStory(user.uid, s.id); setStories((x) => x.filter((y) => y.id !== s.id)) }} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove saved story"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-muted">Saved stories link to live coverage; a story that has aged out of the news cycle may no longer open.</p>
          </section>

          <div className="mt-10">
            <button onClick={async () => { await logout(); router.push('/') }} className="btn-ghost"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </>
      )}
    </div>
  )
}
