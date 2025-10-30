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
  const { data: { session } } = await supabase.auth.getSession();
  
  console.log("[createMeshyTask] start", { source, hasImageUrl: !!options.imageUrl, hasPrompt: !!options.prompt });
  
  const body: any = { source };
  if (source === "image" && options.imageUrl) {
    body.imageUrl = options.imageUrl;
  } else if (source === "text" && options.prompt) {
    body.prompt = options.prompt;
  } else if (source === "multi-image" && options.imageUrls) {
    body.imageUrls = options.imageUrls;
  }
  
  const res = await fetch(
    `/functions/v1/meshy/tasks`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(body),
    }
  );

  const json = await res.json().catch(() => ({}));
  
  console.log("[createMeshyTask] response", { ok: res.ok, status: res.status, hasId: !!json?.id });
  
  if (!res.ok || !json?.id) {
    const errorMsg = json?.error ?? json?.detail ?? `create failed ${res.status}`;
    throw new Error(errorMsg);
  }
  
  return { id: json.id, meshyId: json.meshyId };
}

export async function fetchTask(id: string): Promise<GenerationTask> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    throw new Error("Invalid task id");
  }
  const { data: { session } } = await supabase.auth.getSession();
  
  const res = await fetch(
    `/functions/v1/meshy/tasks/${encodeURIComponent(id)}`,
    {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Status fetch failed: ${res.status} - ${text}`);
  }

  return res.json();
}
