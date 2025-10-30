import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MESHY_API_KEY = Deno.env.get("MESHY_API_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  console.log("[meshy-create] start");

  let body: any;
  try { 
    body = await req.json(); 
  } catch { 
    return new Response("Bad JSON", { status: 400, headers: corsHeaders }); 
  }

  const source = body.source || "image";
  const imageUrl: string | undefined = body.imageUrl ?? undefined;
  const imageUrls: string[] | undefined = body.imageUrls ?? undefined;
  const prompt: string | undefined = body.prompt ?? undefined;
  const texturePrompt: string | undefined = body.texturePrompt ?? undefined;

  // Validate based on source
  if (source === "image" && !imageUrl) {
    return new Response("imageUrl required for image source", { status: 400, headers: corsHeaders });
  }
  if (source === "multi-image" && (!imageUrls || imageUrls.length === 0)) {
    return new Response("imageUrls required for multi-image source", { status: 400, headers: corsHeaders });
  }
  if (source === "text" && !prompt) {
    return new Response("prompt required for text source", { status: 400, headers: corsHeaders });
  }

  // Get user from JWT
  const authHeader = req.headers.get("Authorization");
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader ?? "" } },
    auth: { persistSession: false }
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const mode =
    source === "image" ? "image-to-3d" :
    source === "multi-image" ? "multi-image-to-3d" :
    (body.refine ? "text-to-3d:refine" : "text-to-3d:preview");

  // 1) create tracking row
  const { data: taskRow, error: insErr } = await supabase
    .from("generation_tasks")
    .insert({
      user_id: user.id,
      source: source,
      mode: mode,
      prompt: source === "text" ? prompt : texturePrompt ?? null,
      input_image_urls: source === "image" ? [imageUrl] : (source === "multi-image" ? imageUrls : null),
      status: "PENDING",
      progress: 0,
    })
    .select("id")
    .single();

  if (insErr) {
    console.error("[meshy-create] insert error", insErr.message);
    return new Response(JSON.stringify({ error: insErr.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  console.log("[meshy-create] calling Meshy", { 
    hasImageUrl: !!imageUrl, 
    hasImageUrls: !!imageUrls,
    hasPrompt: !!prompt,
    source 
  });

  // 2) call Meshy API
  let endpoint = "";
  let payload: Record<string, unknown> = {};

  if (source === "image") {
    endpoint = "https://api.meshy.ai/openapi/v1/image-to-3d";
    payload = {
      image_url: imageUrl,
      should_remesh: true,
      should_texture: true,
      enable_pbr: true,
      texture_prompt: texturePrompt ?? undefined
    };
  } else if (source === "multi-image") {
    endpoint = "https://api.meshy.ai/openapi/v1/multi-image-to-3d";
    payload = {
      image_urls: imageUrls,
      should_remesh: true,
      should_texture: true,
      enable_pbr: true
    };
  } else {
    endpoint = "https://api.meshy.ai/openapi/v2/text-to-3d";
    payload = body.refine
      ? { mode: "refine", preview_task_id: body.previewTaskId, enable_pbr: true }
      : { mode: "preview", prompt: prompt, should_remesh: true };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MESHY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.result) {
    console.error("[meshy-create] meshy error", res.status, json);
    await supabase
      .from("generation_tasks")
      .update({ status: "FAILED", error: json, finished_at: new Date().toISOString() })
      .eq("id", taskRow.id);
    return new Response(JSON.stringify({ error: json }), { 
      status: res.status || 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const meshyTaskId: string = json.result;
  await supabase
    .from("generation_tasks")
    .update({ status: "IN_PROGRESS", meshy_task_id: meshyTaskId, started_at: new Date().toISOString() })
    .eq("id", taskRow.id);

  console.log("[meshy-create] accepted", { internalId: taskRow.id, meshyTaskId });

  const { error: analyticsError } = await supabase.from("events_analytics").insert({ 
    event: "model_requested", 
    user_id: user.id, 
    ts: new Date().toISOString(), 
    props: { mode, task_id: taskRow.id } 
  });
  
  if (analyticsError) {
    console.error("Analytics insert failed:", analyticsError);
  }

  return new Response(JSON.stringify({ id: taskRow.id, meshyTaskId }), { 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
});
