import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navigation from '@/components/Navigation'
import HybridViewer, { AssetTransform, HybridViewerHandle } from '@/components/Three/HybridViewer'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Upload, Save, RotateCcw, Package, FileBox, ShoppingCart, Loader2 } from 'lucide-react'
import { useGLTF } from '@react-three/drei'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Json } from '@/integrations/supabase/types'

// Helper to convert AssetTransform to Json-compatible format
const transformToJson = (t: AssetTransform): Json => ({
  position: t.position as unknown as Json,
  rotation: t.rotation as unknown as Json,
  scale: t.scale as unknown as Json
})

/**
 * LUMO SAMPLE CHARM MODELS
 */
const SAMPLE_MODELS = [
  {
    name: 'Axolotl',
    url: 'https://npvkyiujvxyrrqdyrhas.supabase.co/storage/v1/object/public/design-files/1ac02421-564b-4201-9675-62316c65f9b7/Axolotl.glb'
  },
  {
    name: 'Capybara',
    url: 'https://npvkyiujvxyrrqdyrhas.supabase.co/storage/v1/object/public/design-files/1ac02421-564b-4201-9675-62316c65f9b7/Capybara.glb'
  },
  {
    name: 'Shiba Inu',
    url: 'https://npvkyiujvxyrrqdyrhas.supabase.co/storage/v1/object/public/design-files/1ac02421-564b-4201-9675-62316c65f9b7/Shiba-Inu.glb'
  },
  {
    name: 'Nightfury',
    url: 'https://npvkyiujvxyrrqdyrhas.supabase.co/storage/v1/object/public/design-files/1ac02421-564b-4201-9675-62316c65f9b7/Nightfury.glb'
  },
  {
    name: 'Yeti',
    url: 'https://npvkyiujvxyrrqdyrhas.supabase.co/storage/v1/object/public/design-files/1ac02421-564b-4201-9675-62316c65f9b7/Yeti.glb'
  }
]

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchParams] = useSearchParams()
  
  const taskId = searchParams.get('taskId')
  
  const [modelUrl, setModelUrl] = useState(SAMPLE_MODELS[0].url)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [transform, setTransform] = useState<AssetTransform>(DEFAULT_TRANSFORM)
  const [isDragging, setIsDragging] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [designId, setDesignId] = useState<string | null>(null)
  const [taskData, setTaskData] = useState<{
    model_glb_url: string | null
    thumbnail_url: string | null
    prompt: string | null
  } | null>(null)

  // Load model from generation_tasks if taskId provided
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
        setUploadedFileName(data.prompt || 'AI Generated Model')
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

  const handleFileSelect = useCallback((file: File) => {
    const ext = file.name.toLowerCase()
    if (!ext.endsWith('.glb') && !ext.endsWith('.gltf')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a .glb or .gltf file',
        variant: 'destructive'
      })
      return
    }

    const blobUrl = URL.createObjectURL(file)
    setModelUrl(blobUrl)
    setUploadedFileName(file.name)
    setTransform(DEFAULT_TRANSFORM)
    toast({
      title: 'Model loaded',
      description: `${file.name} is now displayed`
    })
  }, [toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleSampleSelect = (url: string) => {
    setModelUrl(url)
    setUploadedFileName(null)
    setTransform(DEFAULT_TRANSFORM)
  }

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
        // Create new design from task
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
        // Create standalone design (sample model)
        const { data, error } = await supabase
          .from('designs')
          .insert([{
            user_id: user.id,
            name: `Hybrid Design ${new Date().toLocaleDateString()}`,
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
        description: 'Your hybrid keychain configuration has been saved'
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
            thumbnail_url: taskData?.thumbnail_url
          } as Json
        }])

      if (error) throw error

      toast({
        title: 'Added to cart!',
        description: 'Your hybrid keychain has been added to your cart'
      })

      navigate('/my-designs')
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

  const handleResetPosition = () => {
    setTransform(DEFAULT_TRANSFORM)
    viewerRef.current?.triggerAutoFit()
    toast({
      title: 'Position reset',
      description: 'Charm re-fitted to default position'
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <div className="flex-1 flex pt-16">
        {/* Main Canvas Area */}
        <div className="flex-1 p-4">
          <HybridViewer 
            ref={viewerRef}
            modelUrl={modelUrl}
            initialTransform={transform}
            onTransformChange={setTransform}
            className="h-full w-full min-h-[500px]"
          />
        </div>

        {/* Right Sidebar */}
        <div className="w-72 border-l bg-card p-4 overflow-y-auto">
          {/* AI Model Info (if from taskId) */}
          {taskId && taskData && (
            <Card className="mb-4 border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-primary">AI Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground truncate">
                  {taskData.prompt || 'Custom model'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Section 1: Assets */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Charm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Upload Custom Charm</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag & drop or click to browse
                </p>
                <p className="text-xs text-muted-foreground">.glb or .gltf</p>
              </div>

              {uploadedFileName && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <FileBox className="w-4 h-4 text-primary" />
                  <span className="text-sm truncate flex-1">{uploadedFileName}</span>
                </div>
              )}

              <Separator />

              {/* Sample Models */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Sample Models
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {SAMPLE_MODELS.map((model) => (
                    <Button
                      key={model.name}
                      variant={modelUrl === model.url ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSampleSelect(model.url)}
                    >
                      {model.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleAddToCart}
                className="w-full"
                size="lg"
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
                onClick={() => handleSaveConfig()}
                variant="secondary"
                className="w-full"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Design
              </Button>
              <Button 
                variant="outline"
                onClick={handleResetPosition}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Position
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Preload sample models to prevent lag when switching
SAMPLE_MODELS.forEach((model) => {
  useGLTF.preload(model.url)
})
