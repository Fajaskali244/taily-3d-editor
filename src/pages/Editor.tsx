import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text3D, Center } from '@react-three/drei'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save, ShoppingCart, Download, Palette, Type, Box } from 'lucide-react'
import * as THREE from 'three'

interface Product {
  id: string
  slug: string
  name: string
  description: string
  default_price: number
  max_chars: number
  min_thickness_mm: number
}

interface ProductVariant {
  id: string
  name: string
  base_price: number
  material: string
  color: string
}

interface DesignParams {
  text: string
  font: string
  fontSize: number
  extrusion: number
  material: string
  color: string
  variantId: string
}

// 3D Keychain Component
const Keychain3D = ({ params }: { params: DesignParams }) => {
  const meshRef = useRef<THREE.Mesh>(null)

  const materialProps = {
    acrylic: { color: params.color, transparent: true, opacity: 0.8 },
    metal: { color: params.color, metalness: 0.8, roughness: 0.2 },
    wood: { color: '#8B4513', roughness: 0.8 },
    plastic: { color: params.color, roughness: 0.3 }
  }

  const currentMaterial = materialProps[params.material as keyof typeof materialProps] || materialProps.plastic

  return (
    <group>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Center>
        <Text3D
          ref={meshRef}
          font="/fonts/helvetiker_regular.typeface.json"
          size={1}
          height={params.extrusion}
          curveSegments={12}
          bevelEnabled={true}
          bevelThickness={0.02}
          bevelSize={0.02}
          bevelOffset={0}
          bevelSegments={5}
        >
          {params.text || 'Sample Text'}
          <meshStandardMaterial {...currentMaterial} />
        </Text3D>
      </Center>
    </group>
  )
}

const Editor = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [designParams, setDesignParams] = useState<DesignParams>({
    text: '',
    font: 'helvetiker',
    fontSize: 1,
    extrusion: 0.2,
    material: 'acrylic',
    color: '#000000',
    variantId: ''
  })

  const productSlug = searchParams.get('product')

  useEffect(() => {
    if (productSlug) {
      fetchProduct()
    } else {
      // If no product specified, redirect to catalog
      navigate('/catalog')
    }
  }, [productSlug, navigate])

  const fetchProduct = async () => {
    if (!productSlug) return

    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('slug', productSlug)
        .eq('status', 'active')
        .single()

      if (productError) {
        console.error('Error fetching product:', productError)
        toast({
          title: "Product not found",
          description: "The requested product could not be found.",
          variant: "destructive"
        })
        navigate('/catalog')
        return
      }

      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productData.id)

      if (variantsError) {
        console.error('Error fetching variants:', variantsError)
      }

      setProduct(productData)
      setVariants(variantsData || [])
      
      // Set default variant
      if (variantsData && variantsData.length > 0) {
        const defaultVariant = variantsData[0]
        setDesignParams(prev => ({
          ...prev,
          variantId: defaultVariant.id,
          material: defaultVariant.material,
          color: defaultVariant.color === 'clear' ? '#ffffff' : 
                defaultVariant.color === 'black' ? '#000000' :
                defaultVariant.color === 'white' ? '#ffffff' :
                defaultVariant.color === 'silver' ? '#c0c0c0' :
                defaultVariant.color === 'gold' ? '#ffd700' :
                defaultVariant.color === 'blue' ? '#0000ff' : '#000000'
        }))
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentPrice = () => {
    const selectedVariant = variants.find(v => v.id === designParams.variantId)
    return selectedVariant?.base_price || product?.default_price || 0
  }

  const saveDesign = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save your design.",
        variant: "destructive"
      })
      return
    }

    if (!product || !designParams.text.trim()) {
      toast({
        title: "Design incomplete",
        description: "Please add some text to your design before saving.",
        variant: "destructive"
      })
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('designs')
        .insert({
          user_id: user.id,
          product_id: product.id,
          variant_id: designParams.variantId,
          name: `${product.name} - ${designParams.text}`,
          params: designParams
        })

      if (error) {
        throw error
      }

      toast({
        title: "Design saved!",
        description: "Your design has been saved to your account."
      })
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
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your cart.",
        variant: "destructive"
      })
      return
    }

    if (!product || !designParams.text.trim()) {
      toast({
        title: "Design incomplete",
        description: "Please add some text to your design before adding to cart.",
        variant: "destructive"
      })
      return
    }

    try {
      // First save the design
      const { data: designData, error: designError } = await supabase
        .from('designs')
        .insert({
          user_id: user.id,
          product_id: product.id,
          variant_id: designParams.variantId,
          name: `${product.name} - ${designParams.text}`,
          params: designParams
        })
        .select()
        .single()

      if (designError) throw designError

      // Then add to cart
      const { error: cartError } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          design_id: designData.id,
          quantity: 1
        })

      if (cartError) throw cartError

      toast({
        title: "Added to cart!",
        description: "Your custom design has been added to your cart."
      })
    } catch (error: any) {
      console.error('Error adding to cart:', error)
      toast({
        title: "Failed to add to cart",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Product not found.</p>
          <Button onClick={() => navigate('/catalog')} className="mt-4">
            Browse Products
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 3D Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>3D Preview</CardTitle>
                <CardDescription>See how your design will look</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-square w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg overflow-hidden">
                  <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                    <Keychain3D params={designParams} />
                    <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                  </Canvas>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={saveDesign} disabled={saving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Design'}
              </Button>
              <Button onClick={addToCart} className="flex-1">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart (${getCurrentPrice()})
              </Button>
            </div>
          </div>

          {/* Design Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Type className="h-5 w-5 mr-2" />
                  Text & Typography
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="text">Your Text</Label>
                  <Input
                    id="text"
                    value={designParams.text}
                    onChange={(e) => setDesignParams(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Enter your text..."
                    maxLength={product.max_chars}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {designParams.text.length} / {product.max_chars} characters
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="fontSize">Font Size</Label>
                  <Slider
                    value={[designParams.fontSize]}
                    onValueChange={(value) => setDesignParams(prev => ({ ...prev, fontSize: value[0] }))}
                    max={2}
                    min={0.5}
                    step={0.1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Size: {designParams.fontSize.toFixed(1)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Box className="h-5 w-5 mr-2" />
                  3D Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="extrusion">Thickness</Label>
                  <Slider
                    value={[designParams.extrusion]}
                    onValueChange={(value) => setDesignParams(prev => ({ ...prev, extrusion: value[0] }))}
                    max={1}
                    min={product.min_thickness_mm / 10}
                    step={0.05}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Thickness: {(designParams.extrusion * 10).toFixed(1)}mm
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Material & Color
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Variant</Label>
                  <Select 
                    value={designParams.variantId} 
                    onValueChange={(value) => {
                      const variant = variants.find(v => v.id === value)
                      if (variant) {
                        setDesignParams(prev => ({ 
                          ...prev, 
                          variantId: value,
                          material: variant.material,
                          color: variant.color === 'clear' ? '#ffffff' : 
                                variant.color === 'black' ? '#000000' :
                                variant.color === 'white' ? '#ffffff' :
                                variant.color === 'silver' ? '#c0c0c0' :
                                variant.color === 'gold' ? '#ffd700' :
                                variant.color === 'blue' ? '#0000ff' : '#000000'
                        }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map(variant => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.name} - ${variant.base_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="color">Color</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="color"
                      id="color"
                      value={designParams.color}
                      onChange={(e) => setDesignParams(prev => ({ ...prev, color: e.target.value }))}
                      className="w-12 h-12 rounded border"
                    />
                    <Input
                      value={designParams.color}
                      onChange={(e) => setDesignParams(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Editor