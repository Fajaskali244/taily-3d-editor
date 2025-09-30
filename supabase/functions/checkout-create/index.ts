import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutRequest {
  cartItemIds: string[]
  userId: string
  userEmail?: string
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

    const { cartItemIds, userId, userEmail }: CheckoutRequest = await req.json()
    
    if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      throw new Error('cartItemIds required')
    }

    if (!userId) {
      throw new Error('userId required')
    }

    // Verify userId matches authenticated user
    if (userId !== user.id) {
      throw new Error('Unauthorized: Cannot create order for another user')
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get cart items with snapshots for pricing
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from('cart_items')
      .select('id, quantity, snapshot, design_id')
      .in('id', cartItemIds)
      .eq('user_id', userId)

    if (cartError) throw cartError

    // Compute pricing
    const lines = (cartItems ?? []).map((ci) => {
      const base = 35000
      const params = ci.snapshot as any || {}
      const placed = params.placed || []
      
      const beadCount = placed.filter((item: any) => item.kind === 'bead').length
      const charmCount = placed.filter((item: any) => item.kind === 'charm').length
      
      const beads = beadCount * 7000
      const charms = charmCount * 15000
      const unit = base + beads + charms
      
      return { 
        id: ci.id, 
        qty: ci.quantity, 
        unit_price: unit, 
        line_total: unit * ci.quantity 
      }
    })

    const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0)
    const shipping = subtotal >= 150000 ? 0 : 15000
    const tax = 0
    const discount_total = 0
    const grand_total = subtotal + shipping + tax - discount_total

    // Create idempotency key
    const idempotencyKey = await crypto.subtle.digest(
      'SHA-256', 
      new TextEncoder().encode(cartItemIds.join(','))
    ).then(buffer => Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0')).join(''))

    // Create order with upsert for idempotency
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .upsert({
        idempotency_key: idempotencyKey,
        user_id: userId,
        subtotal: subtotal,
        shipping_cost: shipping,
        discount_total: discount_total,
        tax_total: tax,
        grand_total: grand_total,
        total_price: grand_total, // Keep for compatibility
        payment_method: 'manual',
        payment_status: 'pending',
        fulfillment_status: 'unfulfilled',
        shipping_address: 'TBD' // Will be updated later
      }, { 
        onConflict: 'idempotency_key',
        ignoreDuplicates: false
      })
      .select('id, grand_total')
      .single()

    if (orderError) throw orderError

    // Create order items
    const orderItems = cartItems!.map(ci => ({
      order_id: order.id,
      design_id: ci.design_id,
      quantity: ci.quantity,
      price: lines.find(l => l.id === ci.id)?.unit_price || 0
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .upsert(orderItems, { 
        onConflict: 'order_id,design_id',
        ignoreDuplicates: true 
      })

    if (itemsError) console.warn('Order items upsert warning:', itemsError)

    // Log payment event
    await supabaseAdmin
      .from('payment_events')
      .insert({
        order_id: order.id,
        event: 'order_created',
        actor: 'system',
        payload: { userEmail, subtotal, grand_total, itemCount: cartItems.length }
      })

    // Clear cart items after successful order creation
    await supabaseAdmin
      .from('cart_items')
      .delete()
      .in('id', cartItemIds)

    const payUrl = `/orders/${order.id}/pay`

    return new Response(
      JSON.stringify({ 
        pay_url: payUrl, 
        order_id: order.id,
        total: order.grand_total
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400,
      }
    )
  }
})