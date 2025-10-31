import { supabase } from '@/integrations/supabase/client'

export type QualityPreset = "draft" | "standard" | "high";

export async function createMeshyTask(params: {
  imageUrl?: string;
  imageUrls?: string[];
  texturePrompt?: string;
  preset?: QualityPreset;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Authentication required')
  }

  const { data, error } = await supabase.functions.invoke("meshy-create", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: {
      imageUrl: params.imageUrl,
      imageUrls: params.imageUrls,
      texturePrompt: params.texturePrompt,
      preset: params.preset ?? "standard",
    },
  });
  
  if (error || !data?.id) {
    throw new Error(error?.message ?? "meshy-create failed");
  }
  return data as { id: string; meshyTaskId: string };
}

export async function createMeshyTaskFromText(prompt: string, preset?: QualityPreset) {
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
