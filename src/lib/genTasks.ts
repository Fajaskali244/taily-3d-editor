import { supabase } from '@/integrations/supabase/client'

export async function createMeshyTask(imageUrl: string, texturePrompt?: string) {
  if (!imageUrl) throw new Error('imageUrl required')
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Authentication required')
  }

  const { data, error } = await supabase.functions.invoke('meshy', {
    body: { 
      action: 'create',
      source: 'image', 
      imageUrl, 
      texturePrompt 
    },
    headers: { Authorization: `Bearer ${session.access_token}` }
  })

  if (error || !data?.id) {
    throw new Error(error?.message ?? 'create failed (no id)')
  }
  return data as { id: string; meshyId: string }
}

export async function createMeshyTaskFromText(prompt: string) {
  if (!prompt) throw new Error('prompt required')
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Authentication required')
  }

  const { data, error } = await supabase.functions.invoke('meshy', {
    body: { 
      action: 'create',
      source: 'text', 
      prompt 
    },
    headers: { Authorization: `Bearer ${session.access_token}` }
  })

  if (error || !data?.id) {
    throw new Error(error?.message ?? 'create failed (no id)')
  }
  return data as { id: string; meshyId: string }
}

export async function fetchTask(id: string) {
  if (!id) throw new Error('id required')
  const { data: { session } } = await supabase.auth.getSession()

  const { data, error } = await supabase.functions.invoke('meshy', {
    body: { action: 'status', id },
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
  })

  if (error) throw new Error(error.message ?? 'fetch failed')
  return data
}
