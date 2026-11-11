import type { User } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from './config'

// Everything is stored under users/{uid}/... (see firestore.rules).

export interface UserProfile {
  displayName: string
  email: string
  streak: number
  longestStreak: number
  lastActiveDate: string | null
  xp: number
}

export interface SavedStory {
  id: string
  headline: string
  category: string
  sourceCount: number
  avgLean: number | null
  publishedAt: string
  savedAt: number
}

export interface SavedAnalysis {
  id: string
  title: string
  url: string
  source: string
  leanScore: number
  label: string
  scores: Record<string, number>
  savedAt: number
  /** JSON of the full analysis payload (without article text). */
  payload: string
}

export interface GameScore {
  id: string
  game: 'quiz' | 'newsdle' | 'sort'
  storyId: string
  storyHeadline: string
  score: number
  total: number
  savedAt: number
}

function requireDb() {
  if (!db) throw new Error('Accounts are not configured on this deployment.')
  return db
}

const userRef = (uid: string) => doc(requireDb(), 'users', uid)

function todayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function ensureUserProfile(user: User, displayName?: string): Promise<void> {
  if (!db) return
  const ref = userRef(user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return
  await setDoc(ref, {
    displayName: displayName || user.displayName || user.email?.split('@')[0] || 'Reader',
    email: user.email || '',
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    xp: 0,
    createdAt: serverTimestamp(),
  })
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userRef(uid))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    displayName: d.displayName || '',
    email: d.email || '',
    streak: d.streak || 0,
    longestStreak: d.longestStreak || 0,
    lastActiveDate: d.lastActiveDate || null,
    xp: d.xp || 0,
  }
}

export async function updateProfileName(uid: string, displayName: string): Promise<void> {
  await updateDoc(userRef(uid), { displayName })
}

/** Counts a day of activity toward the streak and awards XP. */
export async function recordActivity(uid: string, xp = 10): Promise<UserProfile | null> {
  if (!db) return null
  const ref = userRef(uid)
  const snap = await getDoc(ref)
  const data = snap.exists() ? snap.data() : {}
  const today = todayKey()
  const yesterday = todayKey(new Date(Date.now() - 86_400_000))
  let streak = data.streak || 0
  if (data.lastActiveDate === today) {
    // already counted today
  } else if (data.lastActiveDate === yesterday) {
    streak += 1
  } else {
    streak = 1
  }
  const next = {
    streak,
    longestStreak: Math.max(data.longestStreak || 0, streak),
    lastActiveDate: today,
    xp: (data.xp || 0) + xp,
  }
  await setDoc(ref, next, { merge: true })
  return {
    displayName: data.displayName || '',
    email: data.email || '',
    ...next,
  }
}

export async function saveStory(uid: string, story: Omit<SavedStory, 'savedAt'>): Promise<void> {
  await setDoc(doc(requireDb(), 'users', uid, 'savedStories', story.id), { ...story, savedAt: Date.now() })
}

export async function unsaveStory(uid: string, storyId: string): Promise<void> {
  await deleteDoc(doc(requireDb(), 'users', uid, 'savedStories', storyId))
}

export async function isStorySaved(uid: string, storyId: string): Promise<boolean> {
  const snap = await getDoc(doc(requireDb(), 'users', uid, 'savedStories', storyId))
  return snap.exists()
}

export async function listSavedStories(uid: string, max = 50): Promise<SavedStory[]> {
  const q = query(collection(requireDb(), 'users', uid, 'savedStories'), orderBy('savedAt', 'desc'), limit(max))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...(d.data() as Omit<SavedStory, 'id'>), id: d.id }))
}

export async function saveAnalysis(uid: string, analysis: Omit<SavedAnalysis, 'id' | 'savedAt'>): Promise<string> {
  const id = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  await setDoc(doc(requireDb(), 'users', uid, 'analyses', id), { ...analysis, savedAt: Date.now() })
  return id
}

export async function deleteAnalysis(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(requireDb(), 'users', uid, 'analyses', id))
}

export async function listAnalyses(uid: string, max = 50): Promise<SavedAnalysis[]> {
  const q = query(collection(requireDb(), 'users', uid, 'analyses'), orderBy('savedAt', 'desc'), limit(max))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...(d.data() as Omit<SavedAnalysis, 'id'>), id: d.id }))
}

export async function saveGameScore(uid: string, score: Omit<GameScore, 'id' | 'savedAt'>): Promise<void> {
  const id = `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  await setDoc(doc(requireDb(), 'users', uid, 'scores', id), { ...score, savedAt: Date.now() })
}

export async function listGameScores(uid: string, max = 100): Promise<GameScore[]> {
  const q = query(collection(requireDb(), 'users', uid, 'scores'), orderBy('savedAt', 'desc'), limit(max))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...(d.data() as Omit<GameScore, 'id'>), id: d.id }))
}

export interface Badge {
  id: string
  title: string
  description: string
  icon: string
  earned: boolean
  progress: string
}

export function computeBadges(input: {
  profile: UserProfile | null
  analyses: number
  saved: number
  scores: GameScore[]
}): Badge[] {
  const { profile, analyses, saved, scores } = input
  const quizzes = scores.filter((s) => s.game === 'quiz').length
  const wordWins = scores.filter((s) => s.game === 'newsdle' && s.score > 0).length
  const perfect = scores.filter((s) => s.score === s.total && s.total > 0).length
  const longest = profile?.longestStreak || 0
  const mk = (id: string, title: string, description: string, icon: string, have: number, need: number): Badge => ({
    id,
    title,
    description,
    icon,
    earned: have >= need,
    progress: `${Math.min(have, need)}/${need}`,
  })
  return [
    mk('first-analysis', 'First Look', 'Run your first article analysis', '🔍', analyses, 1),
    mk('bias-buster', 'Bias Buster', 'Analyze 5 articles', '🧪', analyses, 5),
    mk('collector', 'Story Collector', 'Save 3 stories', '📌', saved, 3),
    mk('quiz-whiz', 'Quiz Whiz', 'Finish 3 quizzes', '🧠', quizzes, 3),
    mk('sharp-eye', 'Sharp Eye', 'Get a perfect score in a game', '🎯', perfect, 1),
    mk('streak-3', 'On a Roll', 'Reach a 3-day streak', '🔥', longest, 3),
    mk('streak-7', 'Weekly Reader', 'Reach a 7-day streak', '🗓️', longest, 7),
    mk('wordsmith', 'Wordsmith', 'Solve 3 Newsdle puzzles', '🔤', wordWins, 3),
    mk('gamer', 'Media Gamer', 'Play 10 games', '🎮', scores.length, 10),
  ]
}
