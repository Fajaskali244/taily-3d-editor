import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// IDR pricing constants
const PRICING = {
  base: 25000,          // Basic keyring
  premium: 35000,       // Premium keyring 
  bead: 10000,          // Per bead
  charm: 15000,         // Per charm
  engraving: 10000      // Flat rate for engraving
}

function calcUnitFromSnapshot(snapshot: any): number {
  // Snapshot holds the final selection from Designer
  const params = snapshot || {}
  const placed = params.placed || []
  
  // Base keyring pricing
  const base = PRICING.base
  
  // Calculate components
  const beadCount = placed.filter((item: any) => item.kind === 'bead').length
  const beads = beadCount * PRICING.bead
  
  const charmCount = placed.filter((item: any) => item.kind === 'charm').length  
  const charms = charmCount * PRICING.charm
  
  // Engraving (if text exists)
  const engraving = params.engraving?.text ? PRICING.engraving : 0
  
  return base + beads + charms + engraving
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

    const { cartItemIds } = await req.json()
    
    if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      throw new Error('cartItemIds required')
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get cart items with snapshots
    const { data: items, error } = await supabaseAdmin
      .from('cart_items')
      .select('id, quantity, snapshot')
      .in('id', cartItemIds)

    if (error) throw error

    const lines = (items ?? []).map((ci) => {
      const unit = calcUnitFromSnapshot(ci.snapshot)
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