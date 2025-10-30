import { supabase } from "@/integrations/supabase/client";

export interface GenerationTask {
  id: string;
  status: string;
  progress?: number;
  thumbnail_url?: string;
  model_glb_url?: string;
  model_fbx_url?: string;
  model_usdz_url?: string;
  finished_at?: string;
  error?: any;
}

export async function createMeshyTask(
  source: "image" | "text" | "multi-image",
  options: { imageUrl?: string; prompt?: string; imageUrls?: string[] }
): Promise<{ id: string; meshyId: string }> {
  console.log("[createMeshyTask] start", { source, hasImageUrl: !!options.imageUrl, hasPrompt: !!options.prompt });
  
  const body: any = { source };
  if (source === "image" && options.imageUrl) {
    body.imageUrl = options.imageUrl;
  } else if (source === "text" && options.prompt) {
    body.prompt = options.prompt;
  } else if (source === "multi-image" && options.imageUrls) {
    body.imageUrls = options.imageUrls;
  }
  
  const { data, error } = await supabase.functions.invoke("meshy-create", {
    body
  });

  console.log("[createMeshyTask] response", { error: error?.message, hasId: !!data?.id });
  
  if (error || !data?.id) {
    const errorMsg = error?.message ?? `create failed (no id)`;
    throw new Error(errorMsg);
  }
  
  return { id: data.id, meshyId: data.meshyTaskId };
}

export async function fetchTask(id: string): Promise<GenerationTask> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    throw new Error("Invalid task id");
  }
  
  const { data, error } = await supabase.functions.invoke("meshy-status", {
    method: "GET",
    body: { id }
  });

  if (error) {
    throw new Error(`Status fetch failed: ${error.message}`);
  }

  return data as GenerationTask;
}
