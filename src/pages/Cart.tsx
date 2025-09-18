import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Minus, Plus, ShoppingCart, Trash2, ArrowLeft } from 'lucide-react'

interface CartItem {
  id: string
  quantity: number
  design_id: string
  designs: {
    id: string
    name: string
    preview_url: string
  }
}

const PRICE_PER_KEYCHAIN = 25.00

const Cart = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchCartItems()
    }
  }, [user])

  const fetchCartItems = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          design_id,
          designs (
            id,
            name,
            preview_url
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching cart items:', error)
        toast({
          title: "Error",
          description: "Failed to load cart items",
          variant: "destructive"
        })
      } else {
        setCartItems(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeItem(itemId)
      return
    }

    setUpdating(itemId)

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Error updating quantity:', error)
        toast({
          title: "Error",
          description: "Failed to update quantity",
          variant: "destructive"
        })
      } else {
        setCartItems(cartItems.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        ))
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (itemId: string) => {
    setUpdating(itemId)

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Error removing item:', error)
        toast({
          title: "Error",
          description: "Failed to remove item",
          variant: "destructive"
        })
      } else {
        setCartItems(cartItems.filter(item => item.id !== itemId))
        toast({
          title: "Success",
          description: "Item removed from cart"
        })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setUpdating(null)
    }
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.quantity * PRICE_PER_KEYCHAIN), 0)
  }

  const handleCheckout = () => {
    // For now, just show a placeholder message
    toast({
      title: "Checkout",
      description: "Checkout functionality will be implemented with payment integration"
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue Shopping
          </Button>
          <h1 className="text-3xl font-bold flex items-center">
            <ShoppingCart className="mr-3 h-8 w-8" />
            Shopping Cart
          </h1>
          <p className="text-muted-foreground">Review your selected keychain designs</p>
        </div>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Your cart is empty</p>
              <Button onClick={() => window.location.href = '/'}>
                Start Designing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{item.designs.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            ${PRICE_PER_KEYCHAIN.toFixed(2)} each
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={updating === item.id}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1
                            updateQuantity(item.id, newQuantity)
                          }}
                          className="w-16 text-center"
                          min="1"
                          disabled={updating === item.id}
                        />
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={updating === item.id}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={updating === item.id}
                        >
                          {updating === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
                <Button onClick={handleCheckout} className="w-full mt-4">
                  Proceed to Checkout
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default Cart