import { supabase } from '@/integrations/supabase/client'

export type QualityPreset = "draft" | "standard" | "high";

export async function create3DTask(params: {
  imageUrl?: string;
  texturePrompt?: string;
  prompt?: string;
  preset?: QualityPreset;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Authentication required')
  }

  const { data, error } = await supabase.functions.invoke("hunyuan3d", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: {
      action: 'create',
      imageUrl: params.imageUrl,
      texturePrompt: params.texturePrompt,
      prompt: params.prompt,
    },
  });
  
  if (error || !data?.id) {
    let msg = (error as any)?.message ?? 'generation failed';
    try {
      const body = await (error as any)?.context?.json?.();
      if (body?.error) {
        msg = body.details ? `${body.error}: ${body.details}` : String(body.error);
      }
    } catch {}
    throw new Error(msg);
  }
  return data as { id: string; jobId: string };
}

// Legacy alias for backward compatibility
export async function createMeshyTask(params: {
  imageUrl?: string;
  imageUrls?: string[];
  texturePrompt?: string;
  preset?: QualityPreset;
  forceSmall?: boolean;
}) {
  // Use first image from imageUrls if provided
  const imageUrl = params.imageUrl || params.imageUrls?.[0];
  return create3DTask({
    imageUrl,
    texturePrompt: params.texturePrompt,
    preset: params.preset,
  });
}

export async function createMeshyTaskFromText(prompt: string, preset?: QualityPreset) {
  if (!prompt) throw new Error('prompt required')
  return create3DTask({ prompt, preset });
}

export async function fetchTask(id: string) {
  if (!id) throw new Error('id required')
  const { data: { session } } = await supabase.auth.getSession()

  const { data, error } = await supabase.functions.invoke('hunyuan3d', {
    body: { action: 'status', id },
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
  })

  if (error) throw new Error(error.message ?? 'fetch failed')
  return data
}
