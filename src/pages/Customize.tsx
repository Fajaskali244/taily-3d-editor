import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF, Text3D, Center } from '@react-three/drei'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save, ShoppingCart, RotateCcw, Palette, Type, Gem } from 'lucide-react'
import * as THREE from 'three'

// Color swatches
const COLOR_SWATCHES = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Gold', value: '#eab308' },
]

// Font options
const FONTS = [
  { name: 'Helvetiker', value: 'helvetiker' },
  { name: 'Optimer', value: 'optimer' },
  { name: 'Gentilis', value: 'gentilis' },
]

// Size options with upcharges
const SIZE_OPTIONS = [
  { name: 'Small', value: 'small', scale: 0.8, upcharge: 0 },
  { name: 'Medium', value: 'medium', scale: 1.0, upcharge: 3 },
  { name: 'Large', value: 'large', scale: 1.2, upcharge: 6 },
]

// Mock charm options (would come from database)
const CHARMS = [
  { id: '1', name: 'Heart', price: 2 },
  { id: '2', name: 'Star', price: 2 },
  { id: '3', name: 'Moon', price: 2 },
  { id: '4', name: 'Paw', price: 2 },
]

interface CustomizerState {
  text: string
  font: string
  color: string
  size: string
  charms: string[]
  basePrice: number
  price: number
}

interface Product {
  id: string
  slug: string
  name: string
  default_price: number
  max_chars: number
}

// 3D Model Component
const KeychainModel = ({ state }: { state: CustomizerState }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const sizeOption = SIZE_OPTIONS.find(s => s.value === state.size) || SIZE_OPTIONS[1]

  return (
    <group scale={sizeOption.scale}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Center>
        <Text3D
          ref={meshRef}
          font="/fonts/helvetiker_regular.typeface.json"
          size={1}
          height={0.2}
          curveSegments={12}
          bevelEnabled={true}
          bevelThickness={0.02}
          bevelSize={0.02}
          bevelOffset={0}
          bevelSegments={5}
        >
          {state.text || 'Sample Text'}
          <meshStandardMaterial color={state.color} />
        </Text3D>
      </Center>
    </group>
  )
}

const Customize = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  
  const [state, setState] = useState<CustomizerState>({
    text: '',
    font: 'helvetiker',
    color: '#000000',
    size: 'medium',
    charms: [],
    basePrice: 20,
    price: 23, // medium upcharge
  })

  useEffect(() => {
    fetchProduct()
  }, [slug])

  useEffect(() => {
    calculatePrice()
  }, [state.size, state.charms, state.basePrice])

  const fetchProduct = async () => {
    try {
      if (slug) {
        // Try to fetch specific product by slug
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'active')
          .single()

        if (error || !data) {
          console.log('Product not found, using default')
          setDefaultProduct()
        } else {
          setProduct(data)
          setState(prev => ({ ...prev, basePrice: data.default_price }))
        }
      } else {
        setDefaultProduct()
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      setDefaultProduct()
    } finally {
      setLoading(false)
    }
  }

  const setDefaultProduct = () => {
    setProduct({
      id: 'default',
      slug: 'custom-keychain',
      name: 'Custom Keychain',
      default_price: 20,
      max_chars: 12
    })
    setState(prev => ({ ...prev, basePrice: 20 }))
  }

  const calculatePrice = () => {
    const sizeUpcharge = SIZE_OPTIONS.find(s => s.value === state.size)?.upcharge || 0
    const charmsUpcharge = state.charms.length * 2
    const newPrice = state.basePrice + sizeUpcharge + charmsUpcharge
    setState(prev => ({ ...prev, price: newPrice }))
  }

  const updateState = (key: keyof CustomizerState, value: any) => {
    setState(prev => ({ ...prev, [key]: value }))
  }

  const resetDesign = () => {
    setState({
      text: '',
      font: 'helvetiker',
      color: '#000000',
      size: 'medium',
      charms: [],
      basePrice: state.basePrice,
      price: state.basePrice + 3
    })
  }

  const saveDesign = async () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    if (!state.text.trim()) {
      toast({
        title: "Text required",
        description: "Please add some text to your design.",
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
          name: `${product?.name || 'Custom Keychain'} - ${state.text}`,
          preview_url: null, // Would implement screenshot capture here
        })

      if (error) throw error

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
      setShowAuthModal(true)
      return
    }

    if (!state.text.trim()) {
      toast({
        title: "Text required",
        description: "Please add some text to your design.",
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
          name: `${product?.name || 'Custom Keychain'} - ${state.text}`,
          preview_url: null,
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

      navigate('/cart')
    } catch (error: any) {
      console.error('Error adding to cart:', error)
      toast({
        title: "Failed to add to cart",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const toggleCharm = (charmId: string) => {
    setState(prev => ({
      ...prev,
      charms: prev.charms.includes(charmId)
        ? prev.charms.filter(id => id !== charmId)
        : [...prev.charms, charmId]
    }))
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
                onClick={() => navigate(-1)}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{product?.name}</h1>
                <p className="text-muted-foreground">Customize your keychain design</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${state.price}</div>
              <div className="text-sm text-muted-foreground">Live price</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 3D Canvas */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] overflow-hidden">
              <CardContent className="p-0 h-full">
                <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                  <Canvas
                    camera={{ position: [0, 0, 8], fov: 50 }}
                    dpr={[1, 2]}
                  >
                    <KeychainModel state={state} />
                    <OrbitControls 
                      enablePan={true} 
                      enableZoom={true} 
                      enableRotate={true}
                      minDistance={3}
                      maxDistance={15}
                    />
                    <Environment preset="studio" />
                  </Canvas>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls Panel */}
          <div className="space-y-6">
            {/* Text Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Type className="h-5 w-5 mr-2" />
                  Text
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="text">Your Text</Label>
                  <Input
                    id="text"
                    value={state.text}
                    onChange={(e) => updateState('text', e.target.value)}
                    placeholder="Enter your text..."
                    maxLength={product?.max_chars || 12}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {state.text.length} / {product?.max_chars || 12} characters
                  </p>
                </div>
                
                <div>
                  <Label>Font</Label>
                  <Select value={state.font} onValueChange={(value) => updateState('font', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONTS.map(font => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Color Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Color
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_SWATCHES.map(color => (
                    <button
                      key={color.value}
                      onClick={() => updateState('color', color.value)}
                      className={`w-12 h-12 rounded-lg border-2 transition-all ${
                        state.color === color.value ? 'border-primary scale-110' : 'border-muted hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={state.color}
                    onChange={(e) => updateState('color', e.target.value)}
                    className="w-12 h-10 rounded border"
                  />
                  <Input
                    value={state.color}
                    onChange={(e) => updateState('color', e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Size Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {SIZE_OPTIONS.map(size => (
                    <div key={size.value} className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="size"
                          value={size.value}
                          checked={state.size === size.value}
                          onChange={(e) => updateState('size', e.target.value)}
                          className="text-primary"
                        />
                        <span>{size.name}</span>
                      </label>
                      <Badge variant={size.upcharge === 0 ? "secondary" : "outline"}>
                        {size.upcharge === 0 ? 'Free' : `+$${size.upcharge}`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Charms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gem className="h-5 w-5 mr-2" />
                  Charms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {CHARMS.map(charm => (
                    <button
                      key={charm.id}
                      onClick={() => toggleCharm(charm.id)}
                      className={`p-3 text-sm rounded-lg border transition-all ${
                        state.charms.includes(charm.id)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">{charm.name}</div>
                      <div className="text-xs opacity-70">${charm.price}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={resetDesign} 
                variant="outline" 
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Design
              </Button>
              
              <Button 
                onClick={saveDesign} 
                variant="outline" 
                className="w-full"
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Design'}
              </Button>
              
              <Button 
                onClick={addToCart} 
                className="w-full"
                size="lg"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart - ${state.price}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              Please sign in to save your design or add it to your cart.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/auth')} className="flex-1">
              Sign In
            </Button>
            <Button variant="outline" onClick={() => setShowAuthModal(false)} className="flex-1">
              Continue Designing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Customize