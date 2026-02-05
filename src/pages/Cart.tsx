import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ShoppingCart, Trash2, Loader2, Package, ArrowRight } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { formatMoney } from '@/lib/currency'

// Lumo v2.0 pricing - flat fee model
const PRICING = {
  base: 50000,
  ai_fee: 20000
}

interface CartItem {
  id: string
  quantity: number
  design_id: string
  snapshot: any
  design?: {
    id: string
    name: string
    layout_type: string | null
    chosen_thumbnail_url: string | null
  }
}

interface PricingResult {
  items: Array<{ id: string; unit_price: number; line_total: number }>
  subtotal: number
  shipping: number
  grand_total: number
}

export default function Cart() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [pricing, setPricing] = useState<PricingResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Fetch cart items
  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      navigate('/auth')
      return
    }

    const fetchCart = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('cart_items')
          .select(`
            id,
            quantity,
            design_id,
            snapshot,
            design:designs (
              id,
              name,
              layout_type,
              chosen_thumbnail_url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCartItems((data as any) || [])
      } catch (error) {
        console.error('Error fetching cart:', error)
        toast({
          title: 'Error loading cart',
          description: 'Please try refreshing the page',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCart()
  }, [user, authLoading, navigate, toast])

  // Calculate pricing when cart items change
  useEffect(() => {
    if (cartItems.length === 0) {
      setPricing(null)
      return
    }

    const calculatePricing = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('cart-price', {
          body: { cartItemIds: cartItems.map(item => item.id) }
        })

        if (error) throw error
        setPricing(data)
      } catch (error) {
        console.error('Error calculating pricing:', error)
        // Fallback to client-side calculation
        const items = cartItems.map(item => {
          const layoutType = item.design?.layout_type || item.snapshot?.layout_type
          const unitPrice = PRICING.base + (layoutType === 'hybrid' ? PRICING.ai_fee : 0)
          return {
            id: item.id,
            unit_price: unitPrice,
            line_total: unitPrice * item.quantity
          }
        })
        const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
        const shipping = subtotal >= 150000 ? 0 : 15000
        setPricing({
          items,
          subtotal,
          shipping,
          grand_total: subtotal + shipping
        })
      }
    }

    calculatePricing()
  }, [cartItems])

  const handleRemoveItem = async (itemId: string) => {
    setRemovingId(itemId)
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setCartItems(prev => prev.filter(item => item.id !== itemId))
      toast({
        title: 'Item removed',
        description: 'The item has been removed from your cart'
      })
    } catch (error) {
      console.error('Error removing item:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove item',
        variant: 'destructive'
      })
    } finally {
      setRemovingId(null)
    }
  }

  const handleCheckout = async () => {
    if (!user || cartItems.length === 0) return

    setIsCheckingOut(true)
    try {
      const { data, error } = await supabase.functions.invoke('checkout-create', {
        body: {
          cartItemIds: cartItems.map(item => item.id),
          userId: user.id,
          userEmail: user.email
        }
      })

      if (error) throw error

      toast({
        title: 'Order created!',
        description: 'Redirecting to payment...'
      })

      // Navigate to payment page
      if (data.pay_url) {
        navigate(data.pay_url)
      } else {
        navigate(`/orders/${data.order_id}/pay`)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: 'Checkout failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setIsCheckingOut(false)
    }
  }

  const getItemPrice = (item: CartItem): number => {
    const layoutType = item.design?.layout_type || item.snapshot?.layout_type
    return PRICING.base + (layoutType === 'hybrid' ? PRICING.ai_fee : 0)
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6 pt-24 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6 pt-24">
          <Card className="text-center py-16">
            <CardContent className="space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                <ShoppingCart className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Your cart is empty</h2>
                <p className="text-muted-foreground">
                  Create a custom keychain to get started!
                </p>
              </div>
              <Button size="lg" onClick={() => navigate('/create')}>
                <Package className="w-4 h-4 mr-2" />
                Create a Design
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto p-6 pt-24 space-y-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Your Cart</h1>
          <span className="text-muted-foreground">({cartItems.length} items)</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-24 h-24 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                      {item.design?.chosen_thumbnail_url || item.snapshot?.thumbnail_url ? (
                        <img
                          src={item.design?.chosen_thumbnail_url || item.snapshot?.thumbnail_url}
                          alt={item.design?.name || 'Keychain'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {item.design?.name || item.snapshot?.name || 'Custom Keychain'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.design?.layout_type === 'hybrid' || item.snapshot?.layout_type === 'hybrid'
                          ? 'AI-Generated Model'
                          : 'Stock Model'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>

                    {/* Price & Remove */}
                    <div className="flex flex-col items-end gap-2">
                      <p className="font-bold text-lg">
                        {formatMoney(getItemPrice(item) * item.quantity)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={removingId === item.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {removingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{pricing ? formatMoney(pricing.subtotal) : '...'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>
                      {pricing?.shipping === 0 
                        ? <span className="text-green-600">Free</span>
                        : pricing 
                          ? formatMoney(pricing.shipping) 
                          : '...'}
                    </span>
                  </div>
                  {pricing && pricing.subtotal < 150000 && (
                    <p className="text-xs text-muted-foreground">
                      Free shipping on orders over {formatMoney(150000)}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{pricing ? formatMoney(pricing.grand_total) : '...'}</span>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={isCheckingOut || !pricing}
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Checkout
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Secure payment via bank transfer
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
