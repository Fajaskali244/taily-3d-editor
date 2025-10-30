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
    throw new Error(`Status fetch failed: ${res.status}`);
  }

  return res.json();
}
