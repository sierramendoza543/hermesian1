import { db } from './config'
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  Timestamp,
  getDoc
} from 'firebase/firestore'

export interface DebateSession {
  id: string
  userId: string
  topic: string
  viewpoint: string
  messages: Array<{
    content: string
    isAI: boolean
    timestamp: string
  }>
  createdAt: Timestamp
  updatedAt: Timestamp
  status: 'active' | 'completed' | 'archived'
}

export async function saveDebateSession(
  userId: string, 
  topic: string, 
  viewpoint: string, 
  messages: any[]
): Promise<string> {
  console.log('Starting saveDebateSession with:', { userId, topic, viewpoint })
  
  if (!userId || !topic || !viewpoint) {
    throw new Error('Missing required fields for debate creation')
  }

  try {
    const debateData = {
      userId,
      topic,
      viewpoint,
      messages,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
    }

    console.log('Attempting to save debate with data:', debateData)
    
    const debateRef = await addDoc(collection(db, 'debates'), debateData)
    console.log('Debate saved successfully with ID:', debateRef.id)
    
    return debateRef.id
  } catch (error) {
    console.error('Detailed error in saveDebateSession:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw error
  }
}

export async function updateDebateSession(
  debateId: string, 
  messages: any[], 
  status: 'active' | 'completed' | 'archived' = 'active'
) {
  try {
    const debateRef = doc(db, 'debates', debateId)
    await updateDoc(debateRef, {
      messages,
      status,
      updatedAt: Timestamp.now()
    })
  } catch (error) {
    console.error('Error updating debate:', error)
    throw error
  }
}

export async function deleteDebateSession(debateId: string) {
  try {
    const debateRef = doc(db, 'debates', debateId)
    await deleteDoc(debateRef)
  } catch (error) {
    console.error('Error deleting debate:', error)
    throw error
  }
}

export async function getUserDebates(userId: string) {
  try {
    const q = query(
      collection(db, 'debates'),
      where('userId', '==', userId)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DebateSession[]
  } catch (error) {
    console.error('Error getting user debates:', error)
    throw error
  }
}

export async function getDebateSession(debateId: string) {
  try {
    const debateRef = doc(db, 'debates', debateId)
    const debateSnap = await getDoc(debateRef)
    if (debateSnap.exists()) {
      return {
        id: debateSnap.id,
        ...debateSnap.data()
      } as DebateSession
    }
    return null
  } catch (error) {
    console.error('Error getting debate:', error)
    throw error
  }
} 