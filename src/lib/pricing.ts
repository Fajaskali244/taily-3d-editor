import { supabase } from '@/integrations/supabase/client'

export type PricingTotals = {
  items: Array<{ 
    id: string
    qty: number
    unit_price: number
    line_total: number 
  }>
  subtotal: number
  shipping: number
  tax: number
  discount_total: number
  grand_total: number
}

// IDR pricing constants
const PRICING = {
  base: 25000,          // Basic keyring
  premium: 35000,       // Premium keyring 
  bead: 10000,          // Per bead
  charm: 15000,         // Per charm
  engraving: 10000      // Flat rate for engraving
}

function isEmpty(v: any): boolean { 
  return v == null || (typeof v === 'object' && Object.keys(v).length === 0) 
}

export function calcUnitFromSnapshot(snapshot: any): number {
  if (!snapshot || isEmpty(snapshot)) return PRICING.base
  
  // Handle normalized snapshot format from Designer
  const params = snapshot as any
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
  const engraving = (params.engraving?.text) ? PRICING.engraving : 0
  
  return base + beads + charms + engraving
}

export async function computeTotals(cartItemIds: string[]): Promise<PricingTotals> {
  // Load cart items with design fallback
  const { data: items, error } = await supabase
    .from('cart_items')
    .select('id, quantity, snapshot, design_id')
    .in('id', cartItemIds)

  if (error) throw error

  // For items with empty/missing snapshots, fetch design params as fallback
  const itemsWithEmptySnapshots = (items ?? []).filter(item => 
    isEmpty(item.snapshot) || !(item.snapshot as any)?.placed?.length
  )
  
  let designParamsById: Record<string, any> = {}
  if (itemsWithEmptySnapshots.length > 0) {
    const designIds = itemsWithEmptySnapshots
      .map(item => item.design_id)
      .filter(Boolean)
    
    if (designIds.length > 0) {
      const { data: designs } = await supabase
        .from('designs')
        .select('id, params')
        .in('id', designIds)
      
      designParamsById = Object.fromEntries(
        (designs ?? []).map(d => [d.id, d.params])
      )
    }
  }

  const lines = (items ?? []).map((ci) => {
    // Use snapshot or fallback to design params
    let snapshot = ci.snapshot
    if (isEmpty(snapshot) || !(snapshot as any)?.placed?.length) {
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

  return { 
    items: lines, 
    subtotal, 
    shipping, 
    tax, 
    discount_total, 
    grand_total 
  }
}