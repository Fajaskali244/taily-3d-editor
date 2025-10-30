import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("MESHY_WEBHOOK_SECRET");
const SIG_HEADER = "x-meshy-signature";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function hexToBytes(hex: string): Uint8Array {
  const s = hex.trim().toLowerCase().replace(/^0x/, "");
  if (s.length % 2) throw new Error("Invalid hex string");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < s.length; i += 2) {
    out[i / 2] = parseInt(s.slice(i, i + 2), 16);
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

async function verifySignature(req: Request, body: Uint8Array): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.warn("MESHY_WEBHOOK_SECRET not set, skipping signature verification");
    return true;
  }

  const sigHex = req.headers.get(SIG_HEADER);
  if (!sigHex) {
    console.error("Missing signature header");
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
  const provided = hexToBytes(sigHex);

  return timingSafeEqual(provided, mac);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET" || req.method === "HEAD") {
    // Meshy may probe the endpoint; return OK without signature
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  console.log("[meshy-webhook] received POST");

  const raw = new Uint8Array(await req.arrayBuffer());

  if (!(await verifySignature(req, raw))) {
    console.error("[meshy-webhook] signature verification failed");
    return new Response("unauthorized", { status: 401, headers: corsHeaders });
  }

  let payload: any;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    console.error("[meshy-webhook] invalid json");
    return new Response("invalid json", { status: 400, headers: corsHeaders });
  }

  const meshyId: string | undefined = payload.task_id ?? payload.id;
  if (!meshyId) {
    console.error("[meshy-webhook] missing task id");
    return new Response("missing task id", { status: 400, headers: corsHeaders });
  }

  const terminal = payload.status === "SUCCEEDED" || payload.status === "FAILED";
  const update: any = {
    status: payload.status ?? null,
    progress: typeof payload.progress === "number" ? payload.progress : null,
    thumbnail_url: payload.thumbnail_url ?? null,
    model_glb_url: payload.model_urls?.glb ?? payload.model_glb_url ?? null,
    model_fbx_url: payload.model_urls?.fbx ?? payload.model_fbx_url ?? null,
    model_usdz_url: payload.model_urls?.usdz ?? payload.model_usdz_url ?? null,
    error: payload.error ?? null,
    finished_at: terminal ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .from("generation_tasks")
    .update(update)
    .eq("meshy_task_id", meshyId);

  if (error) {
    console.error("[meshy-webhook] update error", error.message);
    return new Response(error.message, { status: 500, headers: corsHeaders });
  }

  console.log("[meshy-webhook] updated", { meshy_task_id: meshyId, status: update.status });

  await supabase.from("events_analytics").insert({
    event: "meshy_webhook_received",
    props: { meshy_task_id: meshyId, status: update.status }
  }).catch((e) => console.error("Analytics insert failed:", e));

  return new Response("ok", { status: 200, headers: corsHeaders });
});
