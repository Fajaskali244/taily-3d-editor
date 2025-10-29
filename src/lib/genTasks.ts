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

export async function fetchTask(id: string): Promise<GenerationTask> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    throw new Error("Invalid task id");
  }
  const { data: { session } } = await supabase.auth.getSession();
  const projectRef = "npvkyiujvxyrrqdyrhas";
  
  const res = await fetch(
    `https://${projectRef}.supabase.co/functions/v1/meshy-status?id=${encodeURIComponent(id)}`,
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
