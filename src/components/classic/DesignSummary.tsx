import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { 
  ShoppingCart, 
  Save, 
  Trash2, 
  GripVertical, 
  Package,
  User
} from 'lucide-react'
import { fetchCatalogItems } from '@/lib/catalog'
import type { PlacedItem, CatalogItem } from '@/lib/catalog'

interface DesignSummaryProps {
  state: {
    keyringId: string
    placed: PlacedItem[]
    params: { colorTheme?: string }
    pricing: { subtotal: number; itemCount: number }
  }
  onRemoveItem: (uid: string) => void
  onReorderItems: (fromIndex: number, toIndex: number) => void
  user: any
}

interface LineItem {
  uid: string
  name: string
  price: number
  kind: string
  thumbnail: string
}

export const DesignSummary = ({ 
  state, 
  onRemoveItem, 
  onReorderItems, 
  user 
}: DesignSummaryProps) => {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [designName, setDesignName] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const items = await fetchCatalogItems()
        setCatalogItems(items)
      } catch (error) {
        console.error('Failed to load catalog:', error)
      }
    }
    loadCatalog()
  }, [])

  const getItemFromCatalog = (id: string): CatalogItem | undefined => {
    return catalogItems.find(item => item.id === id)
  }

  // Create line items including keyring
  const getLineItems = (): LineItem[] => {
    const items: LineItem[] = []
    
    // Add keyring
    const keyring = getItemFromCatalog(state.keyringId)
    if (keyring) {
      items.push({
        uid: `keyring_${state.keyringId}`,
        name: keyring.name,
        price: keyring.price,
        kind: 'keyring',
        thumbnail: keyring.thumbnail
      })
    }

    // Add placed items
    state.placed
      .sort((a, b) => a.positionIndex - b.positionIndex)
      .forEach(item => {
        const catalogItem = getItemFromCatalog(item.catalogId)
        if (catalogItem) {
          items.push({
            uid: item.uid,
            name: catalogItem.name,
            price: catalogItem.price,
            kind: catalogItem.kind,
            thumbnail: catalogItem.thumbnail
          })
        }
      })

    return items
  }

  const lineItems = getLineItems()

  const saveDesign = async () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    if (!designName.trim()) {
      toast({
        title: "Design name required",
        description: "Please enter a name for your design.",
        variant: "destructive"
      })
      return
    }

    setSaving(true)

    try {
      const designData = {
        user_id: user.id,
        name: designName,
        params: JSON.stringify({
          keyringId: state.keyringId,
          placed: state.placed,
          params: state.params,
          pricing: state.pricing
        }),
        preview_url: null // TODO: Implement canvas screenshot
      }

      const { error } = await supabase
        .from('designs')
        .insert(designData)

      if (error) throw error

      // Clear localStorage draft
      localStorage.removeItem('taily.classicDraft')

      toast({
        title: "Design saved!",
        description: "Your classic keychain design has been saved."
      })

      setDesignName('')
    } catch (error: any) {
      console.error('Error saving design:', error)
      toast({
        title: "Failed to save design",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const addToCart = async () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    if (state.placed.length === 0) {
      toast({
        title: "Empty design",
        description: "Please add some items to your keychain first.",
        variant: "destructive"
      })
      return
    }

    setAddingToCart(true)

    try {
      // Save design first
      const designData = {
        user_id: user.id,
        name: designName || `Classic Keychain - ${new Date().toLocaleDateString()}`,
        params: JSON.stringify({
          keyringId: state.keyringId,
          placed: state.placed,
          params: state.params,
          pricing: state.pricing
        }),
        preview_url: null
      }

      const { data: savedDesign, error: designError } = await supabase
        .from('designs')
        .insert(designData)
        .select()
        .single()

      if (designError) throw designError

      // Add to cart
      const { error: cartError } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          design_id: savedDesign.id,
          quantity: 1
        })

      if (cartError) throw cartError

      // Clear localStorage draft
      localStorage.removeItem('taily.classicDraft')

      toast({
        title: "Added to cart!",
        description: "Your classic keychain design has been added to your cart."
      })

    } catch (error: any) {
      console.error('Error adding to cart:', error)
      toast({
        title: "Failed to add to cart",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setAddingToCart(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      // Only reorder placed items (skip keyring at index 0)
      if (draggedIndex > 0 && dropIndex > 0) {
        onReorderItems(draggedIndex - 1, dropIndex - 1)
      }
    }
    setDraggedIndex(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Design Summary
            </div>
            <Badge variant="outline">
              {state.pricing.itemCount} items
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Line Items */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {lineItems.map((item, index) => (
              <div
                key={item.uid}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  item.kind === 'keyring' ? 'bg-blue-50 border-blue-200' : 'bg-background'
                }`}
                draggable={item.kind !== 'keyring'}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="flex items-center space-x-3">
                  {item.kind !== 'keyring' && (
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  )}
                  <img 
                    src={item.thumbnail} 
                    alt={item.name}
                    className="w-8 h-8 rounded object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg'
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.kind}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    IDR {item.price.toLocaleString()}
                  </span>
                  {item.kind !== 'keyring' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItem(item.uid)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {lineItems.length === 1 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Drag items from the panel to start designing</p>
            </div>
          )}

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>IDR {state.pricing.subtotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Save Name Input */}
          {user && (
            <div>
              <Input
                placeholder="Design name (optional)"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={saveDesign}
              disabled={saving || !user}
              className="flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Design'}
            </Button>
            
            <Button
              onClick={addToCart}
              disabled={addingToCart || state.placed.length === 0}
              className="flex items-center"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </Button>
          </div>

          {!user && (
            <p className="text-xs text-muted-foreground text-center">
              <User className="h-3 w-3 inline mr-1" />
              Sign in to save designs and add to cart
            </p>
          )}
        </CardContent>
      </Card>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              You need to sign in to save designs and add items to your cart.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAuthModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => window.location.href = '/auth'}>
              Sign In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}