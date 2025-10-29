import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return new Response("Missing id", { status: 400, headers: corsHeaders });
  }

  // Use caller JWT so RLS enforces owner-only reads
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }
  });

  const { data, error } = await supabase
    .from("generation_tasks")
    .select("id,status,progress,thumbnail_url,model_glb_url,model_fbx_url,model_usdz_url,finished_at,error")
    .eq("id", id)
    .single();

  if (error) {
    return new Response(error.message, { status: 404, headers: corsHeaders });
  }

  return new Response(JSON.stringify(data), { 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
});
