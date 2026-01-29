import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Lumo v2.0 pricing - flat fee model
const PRICING = {
  base: 50000,     // Base keyring assembly price (IDR)
  ai_fee: 20000    // Additional fee for AI-generated models
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { cartItemIds } = await req.json()
    
    if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      throw new Error('cartItemIds required')
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get cart items
    const { data: items, error } = await supabaseAdmin
      .from('cart_items')
      .select('id, quantity, snapshot, design_id')
      .in('id', cartItemIds)

    if (error) throw error

    // Get design layout_type for all items with design_id
    const designIds = (items ?? []).map(i => i.design_id).filter(Boolean)
    let designLayoutTypes: Record<string, string> = {}
    
    if (designIds.length > 0) {
      const { data: designs } = await supabaseAdmin
        .from('designs')
        .select('id, layout_type')
        .in('id', designIds)
      
      designLayoutTypes = Object.fromEntries(
        (designs ?? []).map((d: any) => [d.id, d.layout_type])
      )
    }

    // Calculate pricing with flat fee model
    const lines = (items ?? []).map((ci: any) => {
      let unit = PRICING.base
      
      // Add AI fee if hybrid layout (from design or snapshot)
      const layoutType = designLayoutTypes[ci.design_id] || ci.snapshot?.layout_type
      if (layoutType === 'hybrid') {
        unit += PRICING.ai_fee
      }
      
      return { 
        id: ci.id, 
        qty: ci.quantity, 
        unit_price: unit, 
        line_total: unit * ci.quantity 
      }
    })

    const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0)
    const shipping = subtotal >= 150000 ? 0 : 15000 // Free shipping over 150k IDR
    const tax = 0
    const discount_total = 0
    const grand_total = subtotal + shipping + tax - discount_total

    const totals = { 
      items: lines, 
      subtotal, 
      shipping, 
      tax, 
      discount_total, 
      grand_total 
    }

    console.log('Cart price calculated:', { itemCount: lines.length, subtotal, grand_total })

    return new Response(
      JSON.stringify(totals),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Cart price error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400,
      }
    )
  }
})
