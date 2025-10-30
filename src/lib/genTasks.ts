import { supabase } from '@/integrations/supabase/client'

const EDGE_FN_BASE = 'https://npvkyiujvxyrrqdyrhas.functions.supabase.co/meshy'

export async function createMeshyTask(imageUrl: string, texturePrompt?: string) {
  if (!imageUrl) throw new Error('imageUrl required')
  const { data: { session } } = await supabase.auth.getSession()

  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const res = await fetch(`${EDGE_FN_BASE}/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ source: 'image', imageUrl, texturePrompt })
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`create failed ${res.status}: ${t || 'unknown error'}`)
  }

  const data = await res.json()
  if (!data?.id) throw new Error('create failed (no id)')
  return data as { id: string; meshyId: string }
}

export async function fetchTask(id: string) {
  if (!id) throw new Error('id required')
  const { data: { session } } = await supabase.auth.getSession()

  const headers: HeadersInit = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const res = await fetch(`${EDGE_FN_BASE}/tasks/${id}`, { headers })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || 'fetch failed')
  }

  return res.json()
}
