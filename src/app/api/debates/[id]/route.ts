import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { doc, deleteDoc } from 'firebase/firestore'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Debate storage is not configured' }, { status: 503 })
    }
    const { id } = await params
    const debateRef = doc(db, 'debates', id)
    await deleteDoc(debateRef)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting debate:', error)
    return NextResponse.json(
      { error: 'Failed to delete debate' },
      { status: 500 }
    )
  }
} 