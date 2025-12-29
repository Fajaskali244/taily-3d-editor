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
    payload.ImageUrl = params.imageUrl;
  } else if (params.prompt) {
    payload.Prompt = params.prompt;
  } else {
    throw new Error("Either imageUrl or prompt is required");
  }

  const response = await callTencentApi("SubmitHunyuanTo3DProJob", payload);
  
  if (!response.JobId) {
    throw new Error("No JobId returned from Hunyuan API");
  }
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
  
  // LOGGING: Explicitly log the full response to help debug extraction issues
  console.log(`[hunyuan3d] DEBUG RESPONSE for ${jobId}:`, JSON.stringify(response, null, 2));

  const status = response.Status as "WAIT" | "RUN" | "DONE" | "FAIL";
  
  let glbUrl: string | undefined;
  let thumbnailUrl: string | undefined;

  // UPDATED: Aggressive Extraction Logic
  if (status === "DONE") {
    const files = response.ResultFile3Ds || [];
    
    // Strategy 1: Look for specific 'glb' type
    for (const file of files) {
      // Normalize keys just in case
      const url = file.Url || file.FileUrl || file.DownloadUrl || file.Address;
      if (!url) continue;

      if (file.Type?.toLowerCase().includes("glb") || url.toLowerCase().includes(".glb")) {
        glbUrl = url;
        thumbnailUrl = file.PreviewImageUrl || file.ResultImage || file.ThumbnailUrl;
        break; // Found it
      }
    }

    // Strategy 2: If no GLB found, just take the FIRST file that has a URL
    if (!glbUrl && files.length > 0) {
      console.warn("[hunyuan3d] No explicit GLB found, using first file.");
      const first = files[0];
      glbUrl = first.Url || first.FileUrl || first.DownloadUrl || first.Address;
      thumbnailUrl = first.PreviewImageUrl || first.ResultImage || first.ThumbnailUrl;
    }

    // Strategy 3: Check for root level images if missing
    if (!thumbnailUrl && response.ResultImage?.FileUrl) {
      thumbnailUrl = response.ResultImage.FileUrl;
    }
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

    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!jwt) return j({ error: "invalid authorization" }, 401);

    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !authData?.user) return j({ error: "unauthorized" }, 401);
    const userId = authData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ===== CREATE =====
    if (action === "create") {
      const source = body.imageUrl ? "image" : body.prompt ? "text" : null;
      if (!source) return j({ error: "Either imageUrl or prompt is required" }, 400);

      let prompt = body.prompt;
      let texturePrompt = body.texturePrompt;
      if (prompt && prompt.length > 500) prompt = prompt.slice(0, 500);
      if (texturePrompt && texturePrompt.length > 500) texturePrompt = texturePrompt.slice(0, 500);

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

      if (insErr || !taskRow) return j({ error: `db insert: ${insErr?.message}` }, 500);

      try {
        const jobId = await submitJob({ imageUrl: body.imageUrl, prompt, texturePrompt });

        await supabaseAdmin
          .from("generation_tasks")
          .update({
            meshy_task_id: jobId,
            status: "IN_PROGRESS",
            started_at: new Date().toISOString(),
          })
          .eq("id", taskRow.id);

        return j({ id: taskRow.id, jobId }, 201);
      } catch (e) {
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

    // ===== STATUS =====
    if (action === "status" && body.id) {
      const { data: task, error: taskErr } = await supabaseAdmin
        .from("generation_tasks")
        .select("*")
        .eq("id", body.id)
        .single();

      if (taskErr || !task) return j({ error: "task not found" }, 404);

      if (task.status === "SUCCEEDED" || task.status === "FAILED" || task.status === "DELETED") {
        return j(task);
      }

      const jobId = task.meshy_task_id;
      if (!jobId) return j({ error: "no job id for task" }, 400);

      try {
        const result = await queryJob(jobId);

        const updates: Record<string, unknown> = {
          progress: result.progress ?? task.progress,
        };

        if (result.status === "DONE") {
          updates.status = "SUCCEEDED";
          updates.finished_at = new Date().toISOString();
          updates.progress = 100;
          
          let finalModelUrl = result.glbUrl;

          if (!finalModelUrl) {
            console.error("[hunyuan3d] CRITICAL: Job DONE but extracted URL is empty. Check logs for response structure.");
          }

          // Mirror GLB to storage if possible
          if (finalModelUrl) {
            try {
              const bucket = "design-files"; 
              const path = `${task.user_id}/${task.id}.glb`;
              
              const res = await fetch(finalModelUrl);
              if (res.ok) {
                const bytes = new Uint8Array(await res.arrayBuffer());
                const { error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
                  contentType: "model/gltf-binary",
                  upsert: true,
                });
                
                if (!uploadErr) {
                  const publicData = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
                  finalModelUrl = publicData.data.publicUrl;
                } else {
                  console.error("[hunyuan3d] Storage upload failed, using original URL:", uploadErr);
                }
              }
            } catch (e) {
              console.error("[hunyuan3d] Mirror failed, using original URL:", e);
            }
          }

          updates.model_glb_url = finalModelUrl ?? null;
          updates.thumbnail_url = result.thumbnailUrl ?? null;

          // Upsert design automatically if we have a model
          if (finalModelUrl) {
            await supabaseAdmin.from("designs").upsert(
              {
                user_id: task.user_id,
                generation_task_id: task.id,
                chosen_glb_url: finalModelUrl,
                chosen_thumbnail_url: result.thumbnailUrl ?? null,
                name: `Model ${new Date().toLocaleDateString()}`,
                created_at: new Date().toISOString(),
              },
              { onConflict: "generation_task_id" }
            );
          }
        } else if (result.status === "FAIL") {
          updates.status = "FAILED";
          updates.error = { message: result.errorMessage ?? "Generation failed" };
          updates.finished_at = new Date().toISOString();
        } else {
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
