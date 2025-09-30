import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import { SecurityMonitor } from '@/components/SecurityMonitor'
import { Chatbot } from '@/components/Chatbot'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Star, Palette, Zap, Shield } from 'lucide-react'

interface Product {
  id: string
  slug: string
  name: string
  description: string
  default_price: number
  thumbnail_url: string
}

interface ReferenceDesign {
  id: string
  slug: string
  title: string
  description: string | null
  preview_url: string
  thumb_url: string | null
  tags: string[] | null
  is_featured: boolean | null
}

const Index = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [referenceDesigns, setReferenceDesigns] = useState<ReferenceDesign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Start data fetching immediately without delay to reduce request chain
    fetchProducts()
    fetchReferenceDesigns()
  }, [])

  // Prefetch critical data as early as possible
  useEffect(() => {
    // Prefetch reference designs in the background
    const prefetchCriticalData = async () => {
      try {
        // This runs in parallel with component mounting to reduce dependency chain
        supabase.from('reference_designs').select('id').limit(1).then(() => {
          // Connection is warmed up for the main query
        })
      } catch (error) {
        // Silent prefetch, don't affect UX
      }
    }
    prefetchCriticalData()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .limit(4)

      if (error) {
        console.error('Error fetching products:', error)
      } else {
        setProducts(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchReferenceDesigns = async () => {
    try {
      // First try to get featured designs
      let { data, error } = await supabase
        .from('reference_designs')
        .select('id, slug, title, description, preview_url, thumb_url, tags, is_featured')
        .eq('is_featured', true)
        .limit(12)

      // If no featured designs found, fall back to recent ones
      if (!data?.length) {
        const response = await supabase
          .from('reference_designs')
          .select('id, slug, title, description, preview_url, thumb_url, tags, is_featured')
          .order('created_at', { ascending: false })
          .limit(12)
        
        data = response.data
        error = response.error
      }

      if (error) {
        console.error('Error fetching reference designs:', error)
      } else {
        setReferenceDesigns(data || [])
      }
    } catch (error) {
      console.error('Error fetching reference designs:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Critical above-the-fold content first */}
      <Navigation />
      
      {/* Defer SecurityMonitor to improve FCP */}
      {typeof window !== 'undefined' && <SecurityMonitor />}
      
      {/* Hero Section - Optimized for LCP */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid-16" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Design Your Perfect
              <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Custom Keychain
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl" style={{ contentVisibility: 'auto' }}>
              Create personalized keychains and accessories in minutes. From nameplates to zodiac charms, 
              bring your unique style to life with our 3D design tools.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8" asChild>
                <Link to="/customize/classic">
                  Start Designing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8" asChild>
                <Link to="/catalog">
                  Browse Products
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Deferred for better LCP */}
      <section className="py-24 bg-muted/50" style={{ contentVisibility: 'auto', containIntrinsicSize: '1200px' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why Choose Taily?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              The fastest way to create custom keychains that reflect your personality
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="text-center">
                <Palette className="mx-auto h-12 w-12 text-primary" />
                <CardTitle>3D Design Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Intuitive 3D editor with real-time preview. See exactly how your keychain will look.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <Zap className="mx-auto h-12 w-12 text-primary" />
                <CardTitle>Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Design to checkout in under 3 clicks. Get your custom keychain in minutes, not hours.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <Shield className="mx-auto h-12 w-12 text-primary" />
                <CardTitle>Premium Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  High-quality materials including acrylic, metal, and wood. Built to last.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <Star className="mx-auto h-12 w-12 text-primary" />
                <CardTitle>Trusted by Thousands</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Join thousands of satisfied customers who love their custom keychains.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Products */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Popular Designs
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Get inspired by our most popular keychain designs
            </p>
          </div>
          
          {loading ? (
            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-[4/3] bg-muted rounded-t-lg" />
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {referenceDesigns.map((design) => {
                const imageUrl = design.thumb_url || design.preview_url
                
                return (
                  <Card key={design.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
                    <div className="aspect-[4/3] overflow-hidden rounded-t-lg bg-muted">
                      <img 
                        src={imageUrl}
                        alt={design.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Failed to load image for design:', design.slug, 'URL:', imageUrl)
                          e.currentTarget.src = '/placeholder.svg'
                        }}
                      />
                    </div>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg line-clamp-1">{design.title}</CardTitle>
                        {design.is_featured && (
                          <Badge variant="secondary">
                            Featured
                          </Badge>
                        )}
                      </div>
                      {design.description && (
                        <CardDescription className="line-clamp-2">
                          {design.description}
                        </CardDescription>
                      )}
                      {design.tags && design.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {design.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" asChild>
                        <Link to={`/customize/classic?ref=${design.slug}`}>
                          Use This Design
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
          
          <div className="mt-12 text-center">
            <Button variant="outline" size="lg" asChild>
              <Link to="/catalog">
                View All Products
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to Create Something Amazing?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/90">
              Join thousands of customers who have created their perfect custom keychains. 
              Start designing yours today!
            </p>
            <div className="mt-10">
              <Button size="lg" variant="secondary" className="h-12 px-8" asChild>
                <Link to="/customize/classic">
                  Start Your Design
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Chatbot */}
      <Chatbot />
    </div>
  )
}

export default Index