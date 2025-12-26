// Tencent Hunyuan 3D Global API integration
// API: hunyuan.intl.tencentcloudapi.com
// Uses TC3-HMAC-SHA256 signing

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TENCENT_SECRET_ID = Deno.env.get("TENCENT_SECRET_ID")!;
const TENCENT_SECRET_KEY = Deno.env.get("TENCENT_SECRET_KEY")!;

// --- CONFIGURATION ---
// MUST use 'hunyuan' service and '2023-09-01' version for the ProJob actions.
// MUST use 'hunyuan.intl.tencentcloudapi.com' for the host if outside mainland China.
const TENCENT_SERVICE = "hunyuan";
const TENCENT_HOST = "hunyuan.intl.tencentcloudapi.com";
const TENCENT_API_VERSION = "2023-09-01";
const TENCENT_REGION = "ap-singapore"; 

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ===== TC3-HMAC-SHA256 Signing Helper =====
function hexEncode(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const keyData = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return hexEncode(hash);
}

async function signTencentRequest(
  action: string,
  payload: Record<string, unknown>,
  region = TENCENT_REGION
): Promise<{ headers: Record<string, string>; body: string }> {
  // Hardcoded to ensure we never accidentally use 'ai3d'
  const service = TENCENT_SERVICE;
  const host = TENCENT_HOST;
  const algorithm = "TC3-HMAC-SHA256";
  const contentType = "application/json; charset=utf-8";

  const now = new Date();
  const timestamp = Math.floor(now.getTime() / 1000);
  const date = now.toISOString().slice(0, 10);

  const payloadStr = JSON.stringify(payload);
  const hashedPayload = await sha256Hex(payloadStr);

  // Canonical request
  const httpMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = [
    httpMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join("\n");

  // String to sign
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  const stringToSign = [algorithm, timestamp, credentialScope, hashedCanonicalRequest].join("\n");

  // Signing key
  const secretDate = await hmacSha256(`TC3${TENCENT_SECRET_KEY}`, date);
  const secretService = await hmacSha256(secretDate, service);
  const secretSigning = await hmacSha256(secretService, "tc3_request");
  const signature = hexEncode(await crypto.subtle.sign("HMAC", 
    await crypto.subtle.importKey("raw", secretSigning, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    new TextEncoder().encode(stringToSign)
  ));

  const authorization = `${algorithm} Credential=${TENCENT_SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    headers: {
      "Content-Type": contentType,
      Host: host,
      "X-TC-Action": action,
      "X-TC-Version": TENCENT_API_VERSION,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Region": region,
      Authorization: authorization,
    },
    body: payloadStr,
  };
}

async function callTencentApi(action: string, payload: Record<string, unknown>) {
  const { headers, body } = await signTencentRequest(action, payload);
  
  console.log(`[hunyuan3d] Calling ${action} on ${TENCENT_HOST} (Version: ${TENCENT_API_VERSION})`);
  
  const response = await fetch(`https://${TENCENT_HOST}/`, {
    method: "POST",
    headers,
    body,
  });

  const result = await response.json();
  
  if (result.Response?.Error) {
    console.error(`[hunyuan3d] API error:`, result.Response.Error);
    throw new Error(`Tencent API error: ${result.Response.Error.Code} - ${result.Response.Error.Message}`);
  }

  return result.Response;
}

// ===== Submit Hunyuan 3D job =====
async function submitJob(params: {
  imageUrl?: string;
  prompt?: string;
  texturePrompt?: string;
}): Promise<string> {
  const payload: Record<string, unknown> = {};

  if (params.imageUrl) {
    // Image-to-3D
    payload.ImageUrl = params.imageUrl;
    // CRITICAL: For 2023-09-01, 'Prompt' and 'ImageUrl' cannot coexist.
    // If we have an image, we MUST NOT send 'Prompt'.
  } else if (params.prompt) {
    // Text-to-3D
    payload.Prompt = params.prompt;
  } else {
    throw new Error("Either imageUrl or prompt is required");
  }

  const response = await callTencentApi("SubmitHunyuanTo3DProJob", payload);
  
  if (!response.JobId) {
    throw new Error("No JobId returned from Hunyuan API");
  }

  console.log(`[hunyuan3d] Job submitted:`, response.JobId);
  return response.JobId;
}

// ===== Query job status =====
async function queryJob(jobId: string): Promise<{
  status: "WAIT" | "RUN" | "DONE" | "FAIL";
  progress?: number;
  glbUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
}> {
  const response = await callTencentApi("QueryHunyuanTo3DProJob", { JobId: jobId });

  const status = response.Status as "WAIT" | "RUN" | "DONE" | "FAIL";
  
  let glbUrl: string | undefined;
  let thumbnailUrl: string | undefined;

  if (status === "DONE" && response.ResultFile3Ds?.length > 0) {
    // Extract GLB URL from results
    for (const file of response.ResultFile3Ds) {
      if (file.FileUrl?.toLowerCase().endsWith(".glb")) {
        glbUrl = file.FileUrl;
      }
    }
    // If no explicit GLB, use first result
    if (!glbUrl && response.ResultFile3Ds[0]?.FileUrl) {
      glbUrl = response.ResultFile3Ds[0].FileUrl;
    }
    // Thumbnail if available
    thumbnailUrl = response.ResultImage?.FileUrl;
  }

  return {
    status,
    progress: status === "DONE" ? 100 : status === "FAIL" ? 0 : response.Progress ?? 50,
    glbUrl,
    thumbnailUrl,
    errorMessage: status === "FAIL" ? response.ErrorMsg : undefined,
  };
}

// ===== Main handler =====
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "missing authorization" }, 401);

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Extract user from JWT
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!jwt) return j({ error: "invalid authorization" }, 401);

    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !authData?.user) return j({ error: "unauthorized" }, 401);
    const userId = authData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // Log startup to verify new code is running
    console.log(`[hunyuan3d] Handling action: ${action} for user: ${userId} (Using Hunyuan International Config)`);

    // ===== CREATE: Submit new generation job =====
    if (action === "create") {
      const source = body.imageUrl ? "image" : body.prompt ? "text" : null;
      if (!source) {
        return j({ error: "Either imageUrl or prompt is required" }, 400);
      }

      // Truncate prompts to safe length
      let prompt = body.prompt;
      let texturePrompt = body.texturePrompt;
      if (prompt && prompt.length > 500) prompt = prompt.slice(0, 500);
      if (texturePrompt && texturePrompt.length > 500) texturePrompt = texturePrompt.slice(0, 500);

      // Insert task row
      const { data: taskRow, error: insErr } = await supabaseAdmin
        .from("generation_tasks")
        .insert({
          user_id: userId,
          source,
          mode: source === "image" ? "image-to-3d" : "text-to-3d",
          prompt: source === "text" ? prompt : texturePrompt ?? null,
          input_image_urls: body.imageUrl ? [body.imageUrl] : null,
          status: "PENDING",
          progress: 0,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insErr || !taskRow) {
        console.error("[hunyuan3d] db insert error:", insErr);
        return j({ error: `db insert: ${insErr?.message}` }, 500);
      }

      // Submit to Hunyuan API
      try {
        const jobId = await submitJob({
          imageUrl: body.imageUrl,
          prompt,
          texturePrompt,
        });

        // Update task with provider job ID
        await supabaseAdmin
          .from("generation_tasks")
          .update({
            meshy_task_id: jobId, // Reusing existing column for provider job ID
            status: "IN_PROGRESS",
            started_at: new Date().toISOString(),
          })
          .eq("id", taskRow.id);

        console.log("[hunyuan3d] Job created successfully:", { id: taskRow.id, jobId });
        return j({ id: taskRow.id, jobId }, 201);
      } catch (e) {
        console.error("[hunyuan3d] Submit error:", e);
        await supabaseAdmin
          .from("generation_tasks")
          .update({
            status: "FAILED",
            error: { message: e instanceof Error ? e.message : String(e) },
            finished_at: new Date().toISOString(),
          })
          .eq("id", taskRow.id);
        return j({ error: "job_submit_failed", details: e instanceof Error ? e.message : String(e) }, 502);
      }
    }

    // ===== STATUS: Poll job status =====
    if (action === "status" && body.id) {
      const { data: task, error: taskErr } = await supabaseAdmin
        .from("generation_tasks")
        .select("*")
        .eq("id", body.id)
        .single();

      if (taskErr || !task) {
        return j({ error: "task not found" }, 404);
      }

      // If already finished, return cached result
      if (task.status === "SUCCEEDED" || task.status === "FAILED" || task.status === "DELETED") {
        return j(task);
      }

      // Poll Hunyuan API
      const jobId = task.meshy_task_id;
      if (!jobId) {
        return j({ error: "no job id for task" }, 400);
      }

      try {
        const result = await queryJob(jobId);

        const updates: Record<string, unknown> = {
          progress: result.progress ?? task.progress,
        };

        if (result.status === "DONE") {
          updates.status = "SUCCEEDED";
          updates.model_glb_url = result.glbUrl ?? null;
          updates.thumbnail_url = result.thumbnailUrl ?? null;
          updates.finished_at = new Date().toISOString();
          updates.progress = 100;

          // Mirror GLB to storage
          if (result.glbUrl) {
            try {
              const bucket = "design-files";
              const path = `${task.user_id}/${task.id}.glb`;
              const res = await fetch(result.glbUrl);
              if (res.ok) {
                const bytes = new Uint8Array(await res.arrayBuffer());
                await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
                  contentType: "model/gltf-binary",
                  upsert: true,
                });
                const publicUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
                updates.model_glb_url = publicUrl;
              }
            } catch (e) {
              console.error("[hunyuan3d] Mirror failed:", e);
            }
          }

          // Upsert design
          await supabaseAdmin.from("designs").upsert(
            {
              user_id: task.user_id,
              generation_task_id: task.id,
              chosen_glb_url: updates.model_glb_url as string,
              chosen_thumbnail_url: updates.thumbnail_url as string,
              name: `Model ${new Date().toLocaleDateString()}`,
              created_at: new Date().toISOString(),
            },
            { onConflict: "generation_task_id" }
          );
        } else if (result.status === "FAIL") {
          updates.status = "FAILED";
          updates.error = { message: result.errorMessage ?? "Generation failed" };
          updates.finished_at = new Date().toISOString();
        } else {
          // WAIT or RUN
          updates.status = "IN_PROGRESS";
        }

        await supabaseAdmin.from("generation_tasks").update(updates).eq("id", task.id);

        return j({ ...task, ...updates });
      } catch (e) {
        console.error("[hunyuan3d] Query error:", e);
        return j({ ...task, error: { message: e instanceof Error ? e.message : String(e) } });
      }
    }

    return j({ error: "invalid action" }, 400);
  } catch (e) {
    console.error("[hunyuan3d] Unhandled error:", e);
    return j({ error: "internal_error", details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
