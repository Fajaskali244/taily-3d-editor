import { supabase } from '@/integrations/supabase/client'

export async function createMeshyTask(imageUrl: string, texturePrompt?: string) {
  if (!imageUrl) throw new Error('imageUrl required')
  const { data: { session } } = await supabase.auth.getSession()

  const { data, error } = await supabase.functions.invoke('meshy/tasks', {
    method: 'POST',
    body: { source: 'image', imageUrl, texturePrompt },
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
  })

  if (error || !data?.id) {
    throw new Error(error?.message ?? 'create failed (no id)')
  }
  return data as { id: string; meshyId: string }
}

export async function fetchTask(id: string) {
  if (!id) throw new Error('id required')
  const { data: { session } } = await supabase.auth.getSession()

  const { data, error } = await supabase.functions.invoke(`meshy/tasks/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
  })

  if (error) throw new Error(error.message ?? 'fetch failed')
  return data
}
