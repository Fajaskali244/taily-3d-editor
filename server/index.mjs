import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import fetch from 'cross-fetch'
import { createClient } from '@supabase/supabase-js'

const app = new Hono()

// Enable CORS for local development
app.use('/*', cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MESHY_API_KEY = process.env.MESHY_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MESHY_API_KEY) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
  auth: { persistSession: false } 
})

// Helper: insert event
async function logEvent(event, user_id, props = {}) {
  await supabase.from('events_analytics').insert({ 
    event, 
    user_id, 
    ts: new Date().toISOString(), 
    props 
  })
}

// Create generation task
app.post('/api/meshy/tasks', async c => {
  const body = await c.req.json()
  const { source, imageUrl, imageUrls, prompt, refine, previewTaskId } = body
  const userId = c.req.header('x-user-id') || null
  
  if (!userId) return c.json({ error: 'unauthorized' }, 401)

  const mode =
    source === 'image' ? 'image-to-3d'
    : source === 'multi-image' ? 'multi-image-to-3d'
    : refine ? 'text-to-3d:refine' : 'text-to-3d:preview'

  const { data: row, error: rowErr } = await supabase
    .from('generation_tasks')
    .insert({
      user_id: userId,
      source,
      mode,
      prompt: prompt ?? null,
      input_image_urls: source === 'image' ? [imageUrl] : (source === 'multi-image' ? imageUrls : null),
      status: 'PENDING'
    })
    .select()
    .single()
    
  if (rowErr) return c.json({ error: rowErr.message }, 400)

  // Call Meshy
  let endpoint, payload
  if (source === 'image') {
    endpoint = 'https://api.meshy.ai/openapi/v1/image-to-3d'
    payload = { 
      image_url: imageUrl, 
      should_remesh: true, 
      should_texture: true, 
      enable_pbr: true 
    }
  } else if (source === 'multi-image') {
    endpoint = 'https://api.meshy.ai/openapi/v1/multi-image-to-3d'
    payload = { 
      image_urls: imageUrls, 
      should_remesh: true, 
      should_texture: true, 
      enable_pbr: true 
    }
  } else {
    endpoint = 'https://api.meshy.ai/openapi/v2/text-to-3d'
    payload = refine 
      ? { mode: 'refine', preview_task_id: previewTaskId, enable_pbr: true }
      : { mode: 'preview', prompt, should_remesh: true }
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${MESHY_API_KEY}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(payload)
  })
  
  if (!res.ok) {
    const err = await res.text()
    await supabase
      .from('generation_tasks')
      .update({ status: 'FAILED', error: { err } })
      .eq('id', row.id)
    return c.json({ error: 'meshy_error', detail: err }, 502)
  }
  
  const { result: meshyId } = await res.json()
  await supabase
    .from('generation_tasks')
    .update({ 
      meshy_task_id: meshyId, 
      status: 'IN_PROGRESS', 
      started_at: new Date().toISOString() 
    })
    .eq('id', row.id)
    
  await logEvent('model_requested', userId, { mode, task_id: row.id })
  return c.json({ id: row.id, meshyId })
})

// Poll task
app.get('/api/meshy/tasks/:id', async c => {
  const id = c.req.param('id')
  const { data: task, error } = await supabase
    .from('generation_tasks')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error || !task) return c.json({ error: 'not_found' }, 404)

  const base =
    task.mode === 'image-to-3d' ? 'openapi/v1/image-to-3d'
    : task.mode === 'multi-image-to-3d' ? 'openapi/v1/multi-image-to-3d'
    : 'openapi/v2/text-to-3d'

  const res = await fetch(`https://api.meshy.ai/${base}/${task.meshy_task_id}`, {
    headers: { Authorization: `Bearer ${MESHY_API_KEY}` }
  })
  
  const meshy = await res.json()
  const updates = {
    status: meshy.status ?? task.status,
    progress: meshy.progress ?? task.progress,
    thumbnail_url: meshy.thumbnail_url ?? task.thumbnail_url
  }
  
  if (meshy.model_urls) {
    updates.model_glb_url = meshy.model_urls.glb ?? task.model_glb_url
    updates.model_fbx_url = meshy.model_urls.fbx ?? task.model_fbx_url
    updates.model_usdz_url = meshy.model_urls.usdz ?? task.model_usdz_url
    updates.texture_urls = meshy.texture_urls ?? task.texture_urls
    updates.finished_at = new Date().toISOString()
  }
  
  await supabase.from('generation_tasks').update(updates).eq('id', id)

  if ((task.status !== 'SUCCEEDED') && updates.status === 'SUCCEEDED') {
    await logEvent('model_succeeded', task.user_id, { task_id: id })
  }
  
  return c.json({ ...task, ...updates })
})

serve({ fetch: app.fetch, port: 8787 })
console.log('🚀 Meshy API proxy server listening on http://localhost:8787')
