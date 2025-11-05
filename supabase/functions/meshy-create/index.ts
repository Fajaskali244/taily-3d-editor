// /supabase/functions/meshy-create/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MESHY_API_KEY = Deno.env.get("MESHY_API_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { 
    status, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}

// ===== Configurable min size =====
const MIN_IMAGE_BYTES = 200 * 1024; // 200 KB

function estimateDataUriBytes(uri: string): number | null {
  if (!uri.startsWith("data:")) return null;
  const comma = uri.indexOf(",");
  if (comma === -1) return null;
  const payload = uri.slice(comma + 1);
  const cleaned = payload.replace(/^base64,/, "");
  return Math.floor((cleaned.length * 3) / 4); // base64 4 chars -> 3 bytes
}

// Robust size probe: HEAD -> Range fallback -> allow unknown
async function probeBytes(url: string): Promise<number | null> {
  const est = estimateDataUriBytes(url);
  if (est !== null) return est;
  
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) {
      const cl = head.headers.get("content-length");
      if (cl && !Number.isNaN(+cl)) return +cl;
    }
    
    // Try Range fallback
    const range = await fetch(url, { headers: { Range: "bytes=0-0" } });
    if (range.ok) {
      const cr = range.headers.get("content-range"); // "bytes 0-0/123456"
      if (cr) {
        const total = cr.split("/").pop();
        if (total && !Number.isNaN(+total)) return +total;
      }
      const cl2 = range.headers.get("content-length");
      if (cl2 && !Number.isNaN(+cl2)) return +cl2;
    }
    return null; // unknown size: don't block
  } catch {
    return null;
  }
}

const PRESETS = {
  draft:    { target_polycount: 120_000, should_remesh: true, should_texture: true, enable_pbr: true },
  standard: { target_polycount: 220_000, should_remesh: true, should_texture: true, enable_pbr: true },
  high:     { target_polycount: 350_000, should_remesh: true, should_texture: true, enable_pbr: true },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return j({ error: "method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "missing authorization" }, 401);

    // Admin client for DB writes - do not forward user Authorization header
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { 
      auth: { persistSession: false }
    });

    // Extract user from incoming Bearer token without binding it to DB requests
    const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    let userId: string | null = null;
    if (jwt) {
      const { data, error } = await supabaseAdmin.auth.getUser(jwt);
      if (error) return j({ error: `auth: ${error.message}` }, 401);
      userId = data?.user?.id ?? null;
    }
    if (!userId) return j({ error: "unauthorized" }, 401);

    let body: any;
    try { body = await req.json(); } catch { return j({ error: "bad json" }, 400); }

    const presetName: "draft"|"standard"|"high" = (body.preset ?? "standard").toLowerCase();
    const preset = PRESETS[presetName] ?? PRESETS.standard;

    // Normalize inputs into a single array
    const urls: string[] = Array.isArray(body.imageUrls) && body.imageUrls.length
      ? body.imageUrls.filter(Boolean)
      : (body.imageUrl ? [body.imageUrl] : []);

    if (urls.length === 0) {
      return j({ error: "missing_image", details: "Provide imageUrl or imageUrls[1..5]" }, 400);
    }

    // Measure and filter each image
    type Measured = { url: string; bytes: number | null };
    const measured: Measured[] = [];
    for (const u of urls) {
      measured.push({ url: u, bytes: await probeBytes(u) });
    }

    const keep = measured.filter(m => m.bytes === null || m.bytes >= MIN_IMAGE_BYTES).map(m => m.url);
    const allKnown = measured.every(m => m.bytes !== null);
    const allTooSmall = allKnown && measured.every(m => (m.bytes ?? 0) < MIN_IMAGE_BYTES);

    if (!body.forceSmall) {
      if (allTooSmall) {
        return j({
          error: "image_too_small",
          details: `All images are < ${Math.round(MIN_IMAGE_BYTES/1024)}KB`,
          samples: measured.slice(0, 3),
          tip: "Upload original photos (≥800px, good lighting). Avoid compressed screenshots or chat re-uploads."
        }, 400);
      }
    }

    // Use kept images, or if nothing survived but we had measurements, use largest
    let usable = keep.length ? keep : (
      measured
        .filter(m => m.bytes !== null)
        .sort((a,b) => (b.bytes! - a.bytes!))
        .slice(0,1)
        .map(m => m.url)
    );

    // If forceSmall is set, use all images
    if (body.forceSmall) {
      usable = measured.map(m => m.url);
    }

    console.log("[meshy-create] measured", measured);
    console.log("[meshy-create] usable", usable);

    // Validate texture prompt length (Meshy API limit: 800 chars)
    let texturePrompt = body.texturePrompt ?? undefined;
    if (texturePrompt && texturePrompt.length > 800) {
      texturePrompt = texturePrompt.slice(0, 800);
      console.log("[meshy-create] truncated texture_prompt to 800 chars");
    }

    const overrides = {
      target_polycount: body.polycount ?? preset.target_polycount,
      should_remesh:    body.should_remesh ?? preset.should_remesh,
      should_texture:   body.should_texture ?? preset.should_texture,
      enable_pbr:       body.enable_pbr ?? preset.enable_pbr,
      texture_prompt:   texturePrompt,
    };

    // Insert tracking row
    const isMulti = usable.length > 1;
    
    const { data: taskRow, error: insErr } = await supabaseAdmin
      .from("generation_tasks")
      .insert({
        user_id: userId,
        source: isMulti ? "multi-image" : "image",
        mode: isMulti ? "multi-image-to-3d" : "image-to-3d",
        prompt: overrides.texture_prompt ?? null,
        input_image_urls: usable,
        status: "PENDING",
        progress: 0,
        created_at: new Date().toISOString(),
        requested_polycount: overrides.target_polycount,
        requested_ai_model: "latest",
        requested_should_remesh: overrides.should_remesh,
        requested_should_texture: overrides.should_texture,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("[meshy-create] db insert error:", insErr);
      return j({ error: `db insert: ${insErr.message}` }, 500);
    }

    // Build Meshy payload - only include the correct key; never both
    const endpoint = isMulti
      ? "https://api.meshy.ai/openapi/v1/multi-image-to-3d"
      : "https://api.meshy.ai/openapi/v1/image-to-3d";

    const payload: Record<string, unknown> = {
      ai_model: "latest",
      target_polycount: overrides.target_polycount,
      should_remesh: overrides.should_remesh,
      should_texture: overrides.should_texture,
      enable_pbr: overrides.enable_pbr,
      texture_prompt: overrides.texture_prompt ?? undefined,
      ...(isMulti ? { image_urls: usable } : { image_url: usable[0] })
    };

    console.log("[meshy-create] calling Meshy", {
      views: usable.length,
      endpoint,
      payloadKey: isMulti ? "image_urls" : "image_url",
      poly: overrides.target_polycount,
      preset: presetName
    });

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${MESHY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let json: any = null;
    try { json = await res.json(); } catch { json = { raw: await res.text().catch(() => "") }; }

    if (!res.ok || !json?.result) {
      console.error("[meshy-create] meshy api error:", res.status, json);
      await supabaseAdmin.from("generation_tasks")
        .update({ status: "FAILED", error: json, finished_at: new Date().toISOString() })
        .eq("id", taskRow.id);
      return j({ error: "meshy_call_failed", details: json }, res.status || 502);
    }

    const meshyTaskId: string = json.result;

    const { error: upErr } = await supabaseAdmin.from("generation_tasks")
      .update({ status: "IN_PROGRESS", meshy_task_id: meshyTaskId, started_at: new Date().toISOString() })
      .eq("id", taskRow.id);
    if (upErr) {
      console.error("[meshy-create] db update error:", upErr);
      return j({ error: `db update: ${upErr.message}` }, 500);
    }

    console.log("[meshy-create] accepted", { id: taskRow.id, meshyTaskId, preset: presetName });
    return j({ id: taskRow.id, meshyTaskId }, 200);

  } catch (e) {
    console.error("[meshy-create] unhandled", e);
    return j({ error: "unhandled", details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
