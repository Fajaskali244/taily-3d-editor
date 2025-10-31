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
    const meshyTaskId: string | undefined = body?.task_id ?? body?.id ?? body?.result_id;
    const modelGlbUrl: string | undefined = body?.model_url ?? body?.model_glb_url ?? body?.model_urls?.glb;
    const thumbUrl: string | undefined = body?.thumbnail_url ?? body?.preview_url;
    const succeeded: boolean = (body?.status ?? "").toUpperCase() === "SUCCEEDED";

    console.log("[meshy-webhook] received", { meshyTaskId, succeeded, hasGlb: !!modelGlbUrl });

    if (!meshyTaskId) return j({ error: "missing task_id" }, 400);

    const { data: task, error: taskErr } = await supabaseAdmin
      .from("generation_tasks")
      .select("id,user_id")
      .eq("meshy_task_id", meshyTaskId)
      .single();

    if (taskErr || !task) return j({ error: "task not found", details: taskErr?.message }, 404);

    if (!succeeded) {
      await supabaseAdmin
        .from("generation_tasks")
        .update({ 
          status: (body?.status ?? "FAILED").toUpperCase(), 
          error: body, 
          finished_at: new Date().toISOString() 
        })
        .eq("id", task.id);
      return j({ ok: true, state: body?.status ?? "unknown" }, 200);
    }

    const { error: upTaskErr } = await supabaseAdmin
      .from("generation_tasks")
      .update({
        status: "SUCCEEDED",
        thumbnail_url: thumbUrl ?? null,
        model_glb_url: modelGlbUrl ?? null,
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

    const insertPayload = {
      user_id: task.user_id,
      generation_task_id: task.id,
      chosen_glb_url: modelGlbUrl ?? null,
      chosen_thumbnail_url: thumbUrl ?? null,
      name: `Model ${new Date().toLocaleDateString()}`,
      created_at: new Date().toISOString()
    };

    const { error: insErr } = await supabaseAdmin
      .from("designs")
      .upsert(insertPayload, { onConflict: "generation_task_id" });

    if (insErr) {
      console.error("[meshy-webhook] upsert design error:", insErr);
      return j({ error: `upsert design: ${insErr.message}` }, 500);
    }

    console.log("[meshy-webhook] success, design linked to task:", task.id);
    return j({ ok: true, designLinkedToTask: task.id }, 200);
  } catch (e) {
    console.error("[meshy-webhook] unhandled error:", e);
    return j({ error: "unhandled", details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
