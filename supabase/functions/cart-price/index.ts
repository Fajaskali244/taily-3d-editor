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

type Snapshot = {
  keyringId?: string
  placed?: Array<{ kind: string; catalogId: string }>
  params?: { colorTheme?: string }
  pricing?: { subtotal: number; itemCount: number }
}

function isEmpty(v: any): boolean { 
  return v == null || (typeof v === 'object' && Object.keys(v).length === 0) 
}

function calcUnitFromSnapshot(snapshot: any): number {
  if (!snapshot || isEmpty(snapshot)) return PRICING.base
  
  // Handle normalized snapshot format from Designer
  const params = snapshot as Snapshot
  const placed = params.placed || []
  
  // Determine keyring type
  const keyringId = params.keyringId || 'keyring-basic'
  const isPremium = keyringId.includes('premium')
  const base = isPremium ? PRICING.premium : PRICING.base
  
  // Calculate components from placed items
  const beadCount = placed.filter((item: any) => item.kind === 'bead').length
  const beads = beadCount * PRICING.bead
  
  const charmCount = placed.filter((item: any) => item.kind === 'charm').length  
  const charms = charmCount * PRICING.charm
  
  // Engraving (check multiple possible locations)
  const engraving = (snapshot.engraving?.text || params.params?.engraving?.text) ? PRICING.engraving : 0
  
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

    // Get cart items with design fallback
    const { data: items, error } = await supabaseAdmin
      .from('cart_items')
      .select('id, quantity, snapshot, design_id')
      .in('id', cartItemIds)

    if (error) throw error

    // For items with empty/missing snapshots, fetch design params as fallback
    const itemsWithEmptySnapshots = (items ?? []).filter((item: any) => 
      isEmpty(item.snapshot) || !item.snapshot?.placed?.length
    )
    
    let designParamsById: Record<string, any> = {}
    if (itemsWithEmptySnapshots.length > 0) {
      const designIds = itemsWithEmptySnapshots
        .map((item: any) => item.design_id)
        .filter(Boolean)
      
      if (designIds.length > 0) {
        const { data: designs } = await supabaseAdmin
          .from('designs')
          .select('id, params')
          .in('id', designIds)
        
        designParamsById = Object.fromEntries(
          (designs ?? []).map((d: any) => [d.id, d.params])
        )
      }
    }

    const lines = (items ?? []).map((ci: any) => {
      // Use snapshot or fallback to design params
      let snapshot = ci.snapshot
      if (isEmpty(snapshot) || !snapshot?.placed?.length) {
        snapshot = designParamsById[ci.design_id] || {}
      }
      
      const unit = calcUnitFromSnapshot(snapshot)
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