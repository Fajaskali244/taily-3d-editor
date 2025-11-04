import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Navigation from '@/components/Navigation'
import { SecurityMonitor } from '@/components/SecurityMonitor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'
import WhyChooseLumo from '@/components/home/WhyChooseLumo'

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

  useEffect(() => {
    // Start data fetching immediately without delay to reduce request chain
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
    }
  }

  return (
    <div className="min-h-screen bg-card">
      {/* Critical above-the-fold content first */}
      <Navigation />
      
      {/* Defer SecurityMonitor to improve FCP */}
      {typeof window !== 'undefined' && <SecurityMonitor />}
      
      {/* Gradient wrapper for Hero and Features sections */}
      <div className="page-gradient text-white">
        {/* Hero Section - Optimized for LCP */}
        <section className="relative overflow-hidden bg-transparent">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid-16" />
          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl text-white">
                Own your Memory
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70 sm:text-xl" style={{ contentVisibility: 'auto' }}>
                Hold the moment that holds you. Upload a photo, shape the details, and receive a 3D print that keeps your story close.
              </p>
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button size="lg" className="h-12 px-8" asChild>
                  <Link to="/create">
                    Start Designing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-12 px-8 bg-white/10 border-white/20 hover:bg-white/20 text-white" asChild>
                  <Link to="/catalog">
                    Browse Products
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <WhyChooseLumo />
      </div>


      {/* CTA Section */}
      <section className="bg-card py-24">
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
                <Link to="/create">
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