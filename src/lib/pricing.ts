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

export function calcUnitFromSnapshot(snapshot: any): number {
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

export async function computeTotals(cartItemIds: string[]): Promise<PricingTotals> {
  const { data: items, error } = await supabase
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

  return { 
    items: lines, 
    subtotal, 
    shipping, 
    tax, 
    discount_total, 
    grand_total 
  }
}