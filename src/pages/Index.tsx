import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import { SecurityMonitor } from '@/components/SecurityMonitor'
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

const Index = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Security Monitor */}
      <div className="container mx-auto px-4 py-4">
        <SecurityMonitor />
      </div>
      
      {/* Hero Section */}
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
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Create personalized keychains and accessories in minutes. From nameplates to zodiac charms, 
              bring your unique style to life with our 3D design tools.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8" asChild>
                <Link to="/customize">
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

      {/* Features Section */}
      <section className="py-24 bg-muted/50">
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
            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-t-lg" />
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <Card key={product.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="aspect-square overflow-hidden rounded-t-lg bg-muted">
                    <img 
                      src={product.thumbnail_url} 
                      alt={product.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg'
                      }}
                    />
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <Badge variant="secondary">
                        ${product.default_price}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {product.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" asChild>
                      <Link to={`/customize/${product.slug}`}>
                        Customize Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
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
                <Link to="/customize">
                  Start Your Design
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Index