import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("MESHY_WEBHOOK_SECRET");
const SIG_HEADER = "x-meshy-signature";

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
  console.log("Webhook received:", req.method, req.url);

  const raw = new Uint8Array(await req.arrayBuffer());

  if (!(await verifySignature(req, raw))) {
    console.error("Signature verification failed");
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw));
    console.log("Webhook payload:", payload);
  } catch (e) {
    console.error("Invalid JSON:", e);
    return new Response("Invalid JSON", { status: 400 });
  }

  const meshyId: string | undefined = payload.task_id ?? payload.id;
  if (!meshyId) {
    console.error("Missing task_id in payload");
    return new Response("Missing task_id", { status: 400 });
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
  };

  if (terminal) {
    update.finished_at = new Date().toISOString();
  }

  console.log("Updating task:", meshyId, update);

  const { error } = await supabase
    .from("generation_tasks")
    .update(update)
    .eq("meshy_task_id", meshyId);

  if (error) {
    console.error("Database update failed:", error);
    return new Response(error.message, { status: 500 });
  }

  // Log analytics event
  await supabase.from("events_analytics").insert({
    event: "meshy_webhook_received",
    props: { meshy_task_id: meshyId, status: update.status }
  }).catch((e) => console.error("Analytics insert failed:", e));

  console.log("Webhook processed successfully");
  return new Response("OK", { status: 200 });
});
