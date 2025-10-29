import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MESHY_API_KEY = Deno.env.get("MESHY_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { 
    ...init, 
    headers: { "Content-Type": "application/json", ...corsHeaders, ...init.headers } 
  });

type Source = "image" | "multi-image" | "text";

async function createTask(userId: string, body: any) {
  const source: Source = body.source;
  const mode =
    source === "image" ? "image-to-3d" :
    source === "multi-image" ? "multi-image-to-3d" :
    (body.refine ? "text-to-3d:refine" : "text-to-3d:preview");

  const { data: row, error: rowErr } = await supabase.from("generation_tasks").insert({
    user_id: userId,
    source,
    mode,
    prompt: source === "text" ? body.prompt ?? null : null,
    input_image_urls: source === "image" ? [body.imageUrl] : (source === "multi-image" ? body.imageUrls : null),
    status: "PENDING",
  }).select().single();
  
  if (rowErr || !row) return json({ error: rowErr?.message ?? "insert_failed" }, { status: 400 });

  let endpoint = "", payload: Record<string, unknown> = {};
  if (source === "image") {
    endpoint = "https://api.meshy.ai/openapi/v1/image-to-3d";
    payload = { image_url: body.imageUrl, should_remesh: true, should_texture: true, enable_pbr: true };
  } else if (source === "multi-image") {
    endpoint = "https://api.meshy.ai/openapi/v1/multi-image-to-3d";
    payload = { image_urls: body.imageUrls, should_remesh: true, should_texture: true, enable_pbr: true };
  } else {
    endpoint = "https://api.meshy.ai/openapi/v2/text-to-3d";
    payload = body.refine
      ? { mode: "refine", preview_task_id: body.previewTaskId, enable_pbr: true }
      : { mode: "preview", prompt: body.prompt, should_remesh: true };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${MESHY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    await supabase.from("generation_tasks").update({ status: "FAILED", error: { err } }).eq("id", row.id);
    return json({ error: "meshy_error", detail: err }, { status: 502 });
  }

  const { result: meshyId } = await res.json() as { result: string };
  await supabase.from("generation_tasks")
    .update({ meshy_task_id: meshyId, status: "IN_PROGRESS", started_at: new Date().toISOString() })
    .eq("id", row.id);

  await supabase.from("events_analytics").insert({ 
    event: "model_requested", 
    user_id: userId, 
    ts: new Date().toISOString(), 
    props: { mode, task_id: row.id } 
  });

  return json({ id: row.id, meshyId }, { status: 201 });
}

async function pollTask(id: string) {
  const { data: task, error } = await supabase.from("generation_tasks").select("*").eq("id", id).single();
  if (error || !task) return json({ error: "not_found" }, { status: 404 });

  const base =
    task.mode === "image-to-3d" ? "openapi/v1/image-to-3d" :
    task.mode === "multi-image-to-3d" ? "openapi/v1/multi-image-to-3d" :
    "openapi/v2/text-to-3d";

  const r = await fetch(`https://api.meshy.ai/${base}/${task.meshy_task_id}`, {
    headers: { Authorization: `Bearer ${MESHY_API_KEY}` },
  });
  const meshy = await r.json();

  const updates: Record<string, unknown> = {
    status: meshy.status ?? task.status,
    progress: meshy.progress ?? task.progress,
    thumbnail_url: meshy.thumbnail_url ?? task.thumbnail_url,
  };
  
  if (meshy.model_urls) {
    updates.model_glb_url = meshy.model_urls.glb ?? task.model_glb_url;
    updates.model_fbx_url = meshy.model_urls.fbx ?? task.model_fbx_url;
    updates.model_usdz_url = meshy.model_urls.usdz ?? task.model_usdz_url;
    updates.texture_urls = meshy.texture_urls ?? task.texture_urls;
    updates.finished_at = new Date().toISOString();
    
    if (task.status !== "SUCCEEDED") {
      await supabase.from("events_analytics").insert({ 
        event: "model_succeeded", 
        user_id: task.user_id, 
        ts: new Date().toISOString(), 
        props: { task_id: id } 
      });
    }
  }
  
  await supabase.from("generation_tasks").update(updates).eq("id", id);

  return json({ ...task, ...updates });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname;
  
  try {
    if (req.method === "POST" && path.endsWith("/tasks")) {
      const userId = req.headers.get("x-user-id") ?? "";
      if (!userId) return json({ error: "unauthorized" }, { status: 401 });
      const body = await req.json();
      return await createTask(userId, body);
    }
    
    const match = path.match(/\/tasks\/([0-9a-f-]+)$/i);
    if (req.method === "GET" && match) {
      return await pollTask(match[1]);
    }
    
    return json({ error: "not_found" }, { status: 404 });
  } catch (e) {
    console.error("Edge function error:", e);
    return json({ error: "edge_exception", detail: String(e) }, { status: 500 });
  }
});
