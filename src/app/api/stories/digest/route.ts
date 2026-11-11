import { NextResponse } from 'next/server'
import { getAllStories } from '@/lib/stories'
import { getDigests } from '@/lib/digest'
import { rateLimited } from '@/lib/apiGuard'

export const maxDuration = 60

export async function POST(request: Request) {
  if (rateLimited(request, 'digest', 30)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  try {
    const body = await request.json()
    const ids: string[] = (Array.isArray(body?.ids) ? body.ids : []).filter((x: unknown) => typeof x === 'string').slice(0, 16)
    const all = await getAllStories()
    const picked = all.filter((s) => ids.includes(s.id))
    return NextResponse.json({ digests: await getDigests(picked) })
  } catch (error) {
    console.error('Digest API error:', error)
    return NextResponse.json({ digests: {} })
  }
}
