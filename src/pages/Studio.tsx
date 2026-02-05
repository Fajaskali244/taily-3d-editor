import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navigation from '@/components/Navigation'
import HybridViewer, { AssetTransform, HybridViewerHandle } from '@/components/Three/HybridViewer'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { Save, RotateCcw, ShoppingCart, Loader2, ArrowUpDown, CreditCard } from 'lucide-react'
import { useGLTF } from '@react-three/drei'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Json } from '@/integrations/supabase/types'
import { STOCK_MODELS, getStockModelBySlug, getDefaultStockModel, getStockModelUrls } from '@/lib/stockModels'
import { formatMoney } from '@/lib/currency'

// Lumo v2.0 pricing
const PRICING = {
  base: 50000,
  ai_fee: 20000
}

// Helper to convert AssetTransform to Json-compatible format
const transformToJson = (t: AssetTransform): Json => ({
  position: t.position as unknown as Json,
  rotation: t.rotation as unknown as Json,
  scale: t.scale as unknown as Json
})

const DEFAULT_TRANSFORM: AssetTransform = {
  position: [0, -2.0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1]
}

export default function Studio() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const viewerRef = useRef<HybridViewerHandle>(null)
  const [searchParams] = useSearchParams()
  
  // URL params: taskId (AI models), stockId (stock models), modelUrl (direct URL)
  const taskId = searchParams.get('taskId')
  const stockId = searchParams.get('stockId')
  const directModelUrl = searchParams.get('modelUrl')
  
  // Determine initial model source
  const getInitialModelUrl = () => {
    if (directModelUrl) return directModelUrl
    if (stockId) {
      const stock = getStockModelBySlug(stockId)
      if (stock) return stock.url
    }
    return getDefaultStockModel().url
  }
  
  const [modelUrl, setModelUrl] = useState(getInitialModelUrl)
  const [modelName, setModelName] = useState<string | null>(null)
  const [transform, setTransform] = useState<AssetTransform>(DEFAULT_TRANSFORM)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [designId, setDesignId] = useState<string | null>(null)
  const [taskData, setTaskData] = useState<{
    model_glb_url: string | null
    thumbnail_url: string | null
    prompt: string | null
  } | null>(null)
  const [isBuyingNow, setIsBuyingNow] = useState(false)

  // Calculate price based on layout type
  const isHybridLayout = !!taskId // AI-generated models are hybrid
  const unitPrice = PRICING.base + (isHybridLayout ? PRICING.ai_fee : 0)

  // Set model name based on source
  useEffect(() => {
    if (taskData?.prompt) {
      setModelName(taskData.prompt)
    } else if (stockId) {
      const stock = getStockModelBySlug(stockId)
      if (stock) setModelName(stock.name)
    } else if (directModelUrl) {
      setModelName('Custom Model')
    } else {
      setModelName(getDefaultStockModel().name)
    }
  }, [taskData, stockId, directModelUrl])

  // Load model from generation_tasks if taskId provided (AI models)
  useEffect(() => {
    if (!taskId) return

    const fetchTask = async () => {
      const { data, error } = await supabase
        .from('generation_tasks')
        .select('model_glb_url, thumbnail_url, prompt')
        .eq('id', taskId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching task:', error)
        toast({
          title: 'Error loading model',
          description: 'Could not load the AI-generated model',
          variant: 'destructive'
        })
        return
      }

      if (data?.model_glb_url) {
        setModelUrl(data.model_glb_url)
        setTaskData(data)
        toast({
          title: 'Model loaded',
          description: 'Your AI-generated charm is ready for assembly'
        })
      }
    }

    fetchTask()
  }, [taskId, toast])

  // Check if there's already a design for this task
  useEffect(() => {
    if (!taskId || !user) return

    const checkExistingDesign = async () => {
      const { data } = await supabase
        .from('designs')
        .select('id, asset_transform')
        .eq('generation_task_id', taskId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setDesignId(data.id)
        if (data.asset_transform && typeof data.asset_transform === 'object') {
          const raw = data.asset_transform as { position?: number[]; rotation?: number[]; scale?: number[] }
          if (raw.position && raw.rotation && raw.scale) {
            setTransform({
              position: raw.position as [number, number, number],
              rotation: raw.rotation as [number, number, number],
              scale: raw.scale as [number, number, number]
            })
          }
        }
      }
    }

    checkExistingDesign()
  }, [taskId, user])

  // Handle vertical position slider
  const handleVerticalChange = useCallback((value: number[]) => {
    const y = value[0]
    setTransform(prev => ({
      ...prev,
      position: [prev.position[0], y, prev.position[2]]
    }))
  }, [])

  const handleSaveConfig = async (): Promise<string | null> => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save your design',
        variant: 'destructive'
      })
      navigate('/auth')
      return null
    }

    setIsSaving(true)
    
    try {
      let savedDesignId = designId

      if (designId) {
        // Update existing design
        const { error } = await supabase
          .from('designs')
          .update({
            asset_transform: transformToJson(transform),
            layout_type: 'hybrid',
            chosen_glb_url: modelUrl,
            chosen_thumbnail_url: taskData?.thumbnail_url
          })
          .eq('id', designId)

        if (error) throw error
      } else if (taskId) {
        // Create new design from AI task
        const { data, error } = await supabase
          .from('designs')
          .insert([{
            user_id: user.id,
            generation_task_id: taskId,
            attached_asset_id: taskId,
            name: taskData?.prompt || `Hybrid Design ${new Date().toLocaleDateString()}`,
            layout_type: 'hybrid',
            asset_transform: transformToJson(transform),
            chosen_glb_url: modelUrl,
            chosen_thumbnail_url: taskData?.thumbnail_url
          }])
          .select('id')
          .single()

        if (error) throw error
        savedDesignId = data.id
        setDesignId(data.id)
      } else {
        // Create design from stock model
        const stockModel = stockId ? getStockModelBySlug(stockId) : getDefaultStockModel()
        const { data, error } = await supabase
          .from('designs')
          .insert([{
            user_id: user.id,
            name: stockModel?.name || `Hybrid Design ${new Date().toLocaleDateString()}`,
            layout_type: 'hybrid',
            asset_transform: transformToJson(transform),
            chosen_glb_url: modelUrl
          }])
          .select('id')
          .single()

        if (error) throw error
        savedDesignId = data.id
        setDesignId(data.id)
      }

      toast({
        title: 'Design saved!',
        description: 'Your keychain configuration has been saved'
      })

      return savedDesignId
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save design',
        variant: 'destructive'
      })
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to add items to cart',
        variant: 'destructive'
      })
      navigate('/auth')
      return
    }

    setIsAddingToCart(true)
    
    try {
      // First save the design if not already saved
      let currentDesignId = designId
      
      if (!currentDesignId) {
        currentDesignId = await handleSaveConfig()
        if (!currentDesignId) {
          throw new Error('Failed to create design')
        }
      }

      // Add to cart
      const { error } = await supabase
        .from('cart_items')
        .insert([{
          user_id: user.id,
          design_id: currentDesignId,
          quantity: 1,
          snapshot: {
            layout_type: 'hybrid',
            asset_transform: transformToJson(transform),
            model_url: modelUrl,
            thumbnail_url: taskData?.thumbnail_url,
            stock_id: stockId || null
          } as Json
        }])

      if (error) throw error

      toast({
        title: 'Added to cart!',
        description: 'Your keychain has been added to your cart'
      })

      navigate('/cart')
    } catch (error) {
      console.error('Add to cart error:', error)
      toast({
        title: 'Failed to add to cart',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  // Buy Now - creates order immediately and goes to payment
  const handleBuyNow = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to purchase',
        variant: 'destructive'
      })
      navigate('/auth')
      return
    }

    setIsBuyingNow(true)
    
    try {
      // First save the design
      let currentDesignId = designId
      
      if (!currentDesignId) {
        currentDesignId = await handleSaveConfig()
        if (!currentDesignId) {
          throw new Error('Failed to create design')
        }
      }

      // Create a temporary cart item
      const { data: cartItem, error: cartError } = await supabase
        .from('cart_items')
        .insert([{
          user_id: user.id,
          design_id: currentDesignId,
          quantity: 1,
          snapshot: {
            layout_type: isHybridLayout ? 'hybrid' : 'standard',
            asset_transform: transformToJson(transform),
            model_url: modelUrl,
            thumbnail_url: taskData?.thumbnail_url,
            stock_id: stockId || null
          } as Json
        }])
        .select('id')
        .single()

      if (cartError) throw cartError

      // Create order directly
      const { data, error } = await supabase.functions.invoke('checkout-create', {
        body: {
          cartItemIds: [cartItem.id],
          userId: user.id,
          userEmail: user.email
        }
      })

      if (error) throw error

      toast({
        title: 'Order created!',
        description: 'Redirecting to payment...'
      })

      // Navigate to payment
      if (data.pay_url) {
        navigate(data.pay_url)
      } else {
        navigate(`/orders/${data.order_id}/pay`)
      }
    } catch (error) {
      console.error('Buy now error:', error)
      toast({
        title: 'Purchase failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setIsBuyingNow(false)
    }
  }

  const handleResetPosition = () => {
    setTransform(DEFAULT_TRANSFORM)
    viewerRef.current?.triggerAutoFit()
    toast({
      title: 'Position reset',
      description: 'Model re-fitted to default position'
    })
  }

  // Determine source type for display
  const sourceType = taskId ? 'AI Model' : stockId ? 'Stock Model' : 'Custom'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <div className="flex-1 flex flex-col pt-16 relative">
        {/* 3D Canvas - Full Screen */}
        <div className="flex-1 relative">
          <HybridViewer 
            ref={viewerRef}
            modelUrl={modelUrl}
            initialTransform={transform}
            onTransformChange={setTransform}
            className="h-full w-full min-h-[500px]"
          />

          {/* Model Info Badge */}
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-background/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{sourceType}</p>
              <p className="font-medium text-sm truncate max-w-[200px]">{modelName}</p>
            </div>
          </div>

          {/* Vertical Fit Slider - Overlay on right side */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
            <div className="bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border flex flex-col items-center gap-3">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <div className="h-40">
                <Slider
                  value={[transform.position[1]]}
                  onValueChange={handleVerticalChange}
                  min={-4}
                  max={0}
                  step={0.1}
                  orientation="vertical"
                  className="h-full"
                />
              </div>
              <span className="text-xs text-muted-foreground">Height</span>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-background/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border flex flex-col items-center gap-3">
              {/* Price Display */}
              <div className="text-center">
                <p className="text-2xl font-bold">{formatMoney(unitPrice)}</p>
                <p className="text-xs text-muted-foreground">
                  {isHybridLayout ? 'Includes AI generation fee' : 'Stock model'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleResetPosition}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSaveConfig()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
                
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                >
                  {isAddingToCart ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 mr-2" />
                  )}
                  Add to Cart
                </Button>
                
                <Button 
                  size="sm"
                  onClick={handleBuyNow}
                  disabled={isBuyingNow}
                  className="px-6"
                >
                  {isBuyingNow ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Buy Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Preload stock models to prevent lag when switching
getStockModelUrls().forEach((url) => {
  useGLTF.preload(url)
})
