import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return j({ error: "method not allowed" }, 405);

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));

    const status = String(body?.status ?? "").toUpperCase();
    const meshyTaskId: string | undefined = body?.task_id ?? body?.id ?? body?.result_id;
    const modelGlbUrl: string | undefined = body?.model_glb_url ?? body?.model_url ?? body?.model_urls?.glb ?? undefined;
    const thumbUrl: string | undefined = body?.thumbnail_url ?? body?.preview_url ?? undefined;

    if (!meshyTaskId) return j({ error: "missing task_id" }, 400);

    // Find our internal task
    const { data: task, error: taskErr } = await supabaseAdmin
      .from("generation_tasks")
      .select("id,user_id")
      .eq("meshy_task_id", meshyTaskId)
      .single();

    if (taskErr || !task) return j({ error: "task not found", details: taskErr?.message }, 404);

    // Handle non-success updates
    if (status !== "SUCCEEDED") {
      await supabaseAdmin
        .from("generation_tasks")
        .update({ 
          status, 
          error: body, 
          finished_at: new Date().toISOString() 
        })
        .eq("id", task.id);
      return j({ ok: true, state: status }, 200);
    }

    // Mirror assets to public Storage
    const bucket = "design-files";
    const basePath = `${task.user_id}/${task.id}`;

    async function mirror(url: string | undefined, path: string, contentType: string): Promise<string | null> {
      if (!url) return null;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`download ${url} -> ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        const up = await supabaseAdmin.storage.from(bucket).upload(path, bytes, { contentType, upsert: true });
        if (up.error) throw up.error;
        return supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      } catch (e) {
        console.error(`[webhook] mirror failed for ${url}:`, e);
        return url ?? null;
      }
    }

    let finalGlbUrl: string | null = null;
    let finalThumbUrl: string | null = null;

    finalGlbUrl = await mirror(modelGlbUrl, `${basePath}.glb`, "model/gltf-binary");
    finalThumbUrl = await mirror(thumbUrl, `${basePath}.jpg`, "image/jpeg");

    // Update task record
    const { error: upTaskErr } = await supabaseAdmin
      .from("generation_tasks")
      .update({
        status: "SUCCEEDED",
        model_glb_url: finalGlbUrl,
        thumbnail_url: finalThumbUrl,
        model_fbx_url: body?.model_urls?.fbx ?? null,
        model_usdz_url: body?.model_urls?.usdz ?? null,
        texture_urls: body?.texture_urls ?? null,
        progress: 100,
        finished_at: new Date().toISOString()
      })
      .eq("id", task.id);

    if (upTaskErr) {
      console.error("[meshy-webhook] update task error:", upTaskErr);
      return j({ error: `update task: ${upTaskErr.message}` }, 500);
    }

    // Upsert design (requires unique index on designs.generation_task_id)
    const payload = {
      user_id: task.user_id,
      generation_task_id: task.id,
      chosen_glb_url: finalGlbUrl,
      chosen_thumbnail_url: finalThumbUrl,
      name: `Model ${new Date().toLocaleDateString()}`,
      created_at: new Date().toISOString()
    };

    const { error: upsertErr } = await supabaseAdmin
      .from("designs")
      .upsert(payload, { onConflict: "generation_task_id" });

    if (upsertErr) {
      console.error("[meshy-webhook] upsert design error:", upsertErr);
      return j({ error: `upsert design: ${upsertErr.message}` }, 500);
    }

    console.log("[meshy-webhook] success, design linked to task:", task.id);
    return j({ ok: true, designLinkedToTask: task.id }, 200);
  } catch (e) {
    console.error("[meshy-webhook] unhandled error:", e);
    return j({ error: "unhandled", details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
