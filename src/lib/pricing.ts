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

export async function computeTotals(cartItemIds: string[]): Promise<PricingTotals> {
  const { data: items, error } = await supabase
    .from('cart_items')
    .select('id, quantity, snapshot')
    .in('id', cartItemIds)

  if (error) throw error

  const lines = (items ?? []).map((ci) => {
    // Base keyring price
    const base = 35000
    
    // Calculate pricing from snapshot params (classic design data)
    const params = ci.snapshot as any || {}
    const placed = params.placed || []
    
    // Bead pricing (7k each)
    const beadCount = placed.filter((item: any) => item.kind === 'bead').length
    const beads = beadCount * 7000
    
    // Charm pricing (15k each) 
    const charmCount = placed.filter((item: any) => item.kind === 'charm').length
    const charms = charmCount * 15000
    
    // Engraving (10k if text exists)
    const engraving = 0 // No engraving in classic for now
    
    const unit = base + beads + charms + engraving
    
    return { 
      id: ci.id, 
      qty: ci.quantity, 
      unit_price: unit, 
      line_total: unit * ci.quantity 
    }
  })

  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0)
  const shipping = subtotal >= 150000 ? 0 : 15000 // Free shipping over 150k
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