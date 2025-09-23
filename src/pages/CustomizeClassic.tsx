import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import { ClassicCanvas } from '@/components/classic/ClassicCanvas'
import { SelectionPanel } from '@/components/classic/SelectionPanel'
import { DesignSummary } from '@/components/classic/DesignSummary'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Undo, Redo, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { PlacedItem, CatalogItem } from '@/lib/catalog'
import { CATALOG_ITEMS } from '@/lib/catalog'
import { supabase } from '@/integrations/supabase/client'
import { captureCanvasScreenshot, uploadPreview } from '@/lib/storage'

export type ItemKind = 'keyring' | 'bead' | 'charm'

interface ClassicState {
  keyringId: string
  placed: PlacedItem[]
  params: { colorTheme?: string }
  pricing: { subtotal: number; itemCount: number }
}

interface HistoryState {
  state: ClassicState
  timestamp: number
}

const CustomizeClassic = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [state, setState] = useState<ClassicState>({
    keyringId: 'keyring-basic',
    placed: [],
    params: { colorTheme: 'silver' },
    pricing: { subtotal: 25, itemCount: 0 }
  })

  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedItem, setDraggedItem] = useState<CatalogItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  // Load guest data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('taily.classicDraft')
    if (saved) {
      try {
        const parsedState = JSON.parse(saved)
        setState(parsedState)
        calculatePricing(parsedState.placed, parsedState.keyringId)
      } catch (error) {
        console.error('Failed to load saved state:', error)
      }
    }
  }, [])

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('taily.classicDraft', JSON.stringify(state))
  }, [state])

  // Add to history when state changes (excluding pricing updates)
  useEffect(() => {
    const newHistory = [...history.slice(0, historyIndex + 1)]
    newHistory.push({ state, timestamp: Date.now() })
    
    // Keep only last 20 entries
    if (newHistory.length > 20) {
      newHistory.shift()
    } else {
      setHistoryIndex(prev => prev + 1)
    }
    
    setHistory(newHistory)
  }, [state.placed, state.keyringId])

  const calculatePricing = (placed: PlacedItem[], keyringId: string) => {
    const keyringPrice = CATALOG_ITEMS.find(item => item.id === keyringId)?.price || 25
    const itemsPrice = placed.reduce((sum, item) => {
      const catalogItem = CATALOG_ITEMS.find(c => c.id === item.catalogId)
      return sum + (catalogItem?.price || 0)
    }, 0)
    
    setState(prev => ({
      ...prev,
      pricing: {
        subtotal: keyringPrice + itemsPrice,
        itemCount: placed.length
      }
    }))
  }

  const addItem = (catalogItem: CatalogItem) => {
    const newItem: PlacedItem = {
      uid: `${catalogItem.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      catalogId: catalogItem.id,
      kind: catalogItem.kind,
      positionIndex: state.placed.length,
      rotation: [0, 0, 0],
      color: catalogItem.kind === 'keyring' ? state.params.colorTheme : undefined
    }

    const newPlaced = [...state.placed, newItem]
    setState(prev => ({
      ...prev,
      placed: newPlaced
    }))
    calculatePricing(newPlaced, state.keyringId)

    if (newPlaced.length > 50) {
      toast({
        title: "Lots of items!",
        description: "You have over 50 items. Consider the size and weight.",
        variant: "default"
      })
    }
  }

  const removeItem = (uid: string) => {
    const newPlaced = state.placed
      .filter(item => item.uid !== uid)
      .map((item, index) => ({ ...item, positionIndex: index }))
    
    setState(prev => ({
      ...prev,
      placed: newPlaced
    }))
    calculatePricing(newPlaced, state.keyringId)
  }

  const reorderItems = (fromIndex: number, toIndex: number) => {
    const newPlaced = [...state.placed]
    const [movedItem] = newPlaced.splice(fromIndex, 1)
    newPlaced.splice(toIndex, 0, movedItem)
    
    // Update position indices
    const reindexed = newPlaced.map((item, index) => ({ ...item, positionIndex: index }))
    
    setState(prev => ({
      ...prev,
      placed: reindexed
    }))
  }

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1].state
      setState(prevState)
      setHistoryIndex(prev => prev - 1)
      calculatePricing(prevState.placed, prevState.keyringId)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1].state
      setState(nextState)
      setHistoryIndex(prev => prev + 1)
      calculatePricing(nextState.placed, nextState.keyringId)
    }
  }

  const handleDragStart = (item: CatalogItem) => {
    setIsDragging(true)
    setDraggedItem(item)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDraggedItem(null)
  }

  const handleCanvasDrop = (item: CatalogItem) => {
    if (item.kind === 'keyring') {
      setState(prev => ({ ...prev, keyringId: item.id }))
      calculatePricing(state.placed, item.id)
    } else {
      addItem(item)
    }
    handleDragEnd()
  }

  const saveDesign = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save your design.",
        variant: "destructive"
      })
      return null
    }

    setSaving(true)
    try {
      // Create design name
      const designName = `Classic Design ${new Date().toLocaleDateString()}`
      
      // Capture canvas screenshot for preview
      const canvas = document.querySelector('canvas')
      let previewUrl = null
      
      if (canvas) {
        const blob = await captureCanvasScreenshot(canvas)
        if (blob) {
          const filename = `preview-${Date.now()}.png`
          previewUrl = await uploadPreview(blob, filename)
        }
      }

      // Save design to database
      const { data: design, error } = await supabase
        .from('designs')
        .insert({
          user_id: user.id,
          name: designName,
          params: state as any,
          preview_url: previewUrl,
          is_published: false
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Design saved!",
        description: "Your design has been saved successfully.",
      })

      return design

    } catch (error: any) {
      console.error('Save error:', error)
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive"
      })
      return null
    } finally {
      setSaving(false)
    }
  }

  const addToCart = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add items to cart.",
        variant: "destructive"
      })
      return
    }

    setAddingToCart(true)
    try {
      // First save the design
      const design = await saveDesign()
      if (!design) return

      // Add to cart with design snapshot
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          design_id: design.id,
          quantity: 1,
          snapshot: state as any // Store current design state for pricing
        })

      if (error) throw error

      toast({
        title: "Added to cart!",
        description: "Your design has been added to the cart.",
      })

    } catch (error: any) {
      console.error('Add to cart error:', error)
      toast({
        title: "Failed to add to cart",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setAddingToCart(false)
    }
  }

  const checkout = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to checkout.",
        variant: "destructive"
      })
      return
    }

    setAddingToCart(true)
    try {
      // First save the design and add to cart
      const design = await saveDesign()
      if (!design) return

      const { data: cartItem, error: cartError } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          design_id: design.id,
          quantity: 1,
          snapshot: state as any
        })
        .select()
        .single()

      if (cartError) throw cartError

      // Create checkout session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('checkout-create', {
        body: {
          cartItemIds: [cartItem.id],
          userId: user.id,
          userEmail: user.email
        }
      })

      if (checkoutError) throw checkoutError

      // Redirect to payment page
      navigate(checkoutData.pay_url)

    } catch (error: any) {
      console.error('Checkout error:', error)
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Classic Charm Designer</h1>
                <p className="text-muted-foreground">Drag & drop beads and charms onto your keychain</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={undo}
                disabled={historyIndex <= 0}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-2xl font-bold">IDR {state.pricing.subtotal.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">{state.pricing.itemCount} items</div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={saveDesign}
                    disabled={saving || !user}
                  >
                    {saving ? 'Saving...' : 'Save Design'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={addToCart}
                    disabled={addingToCart || !user}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {addingToCart ? 'Adding...' : 'Add to Cart'}
                  </Button>
                  <Button 
                    onClick={checkout}
                    disabled={addingToCart || !user}
                  >
                    {addingToCart ? 'Processing...' : 'Buy Now'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 3D Visualizer */}
          <div className="lg:col-span-2 space-y-6">
            <ClassicCanvas
              state={state}
              isDragging={isDragging}
              draggedItem={draggedItem}
              onDrop={handleCanvasDrop}
              onRemoveItem={removeItem}
            />
            
            <DesignSummary
              state={state}
              onRemoveItem={removeItem}
              onReorderItems={reorderItems}
              user={user}
            />
          </div>

          {/* Selection Panel */}
          <div>
            <SelectionPanel
              onItemClick={addItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomizeClassic
