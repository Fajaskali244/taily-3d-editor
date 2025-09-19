import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import Navigation from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Search, Filter } from 'lucide-react'

interface Product {
  id: string
  slug: string
  name: string
  description: string
  default_price: number
  thumbnail_url: string
}

interface ProductVariant {
  id: string
  product_id: string
  name: string
  base_price: number
  material: string
  color: string
  ready_to_ship: boolean
}

const Catalog = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [materialFilter, setMaterialFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')

  useEffect(() => {
    fetchProductsAndVariants()
  }, [])

  const fetchProductsAndVariants = async () => {
    try {
      const [productsResponse, variantsResponse] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('status', 'active'),
        supabase
          .from('product_variants')
          .select('*')
      ])

      if (productsResponse.error) {
        console.error('Error fetching products:', productsResponse.error)
      } else {
        setProducts(productsResponse.data || [])
      }

      if (variantsResponse.error) {
        console.error('Error fetching variants:', variantsResponse.error)
      } else {
        setVariants(variantsResponse.data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProductVariants = (productId: string) => {
    return variants.filter(variant => variant.product_id === productId)
  }

  const getLowestPrice = (productId: string) => {
    const productVariants = getProductVariants(productId)
    if (productVariants.length === 0) return null
    return Math.min(...productVariants.map(v => v.base_price))
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const productVariants = getProductVariants(product.id)
    const matchesMaterial = materialFilter === 'all' || 
                           productVariants.some(v => v.material === materialFilter)
    
    const lowestPrice = getLowestPrice(product.id) || product.default_price
    const matchesPrice = priceFilter === 'all' ||
                        (priceFilter === 'under-25' && lowestPrice < 25) ||
                        (priceFilter === '25-35' && lowestPrice >= 25 && lowestPrice <= 35) ||
                        (priceFilter === 'over-35' && lowestPrice > 35)
    
    return matchesSearch && matchesMaterial && matchesPrice
  })

  const materials = [...new Set(variants.map(v => v.material))]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="mb-4 flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Product Catalog
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Discover our full range of customizable keychains and accessories
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={materialFilter} onValueChange={setMaterialFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  {materials.map(material => (
                    <SelectItem key={material} value={material}>
                      {material.charAt(0).toUpperCase() + material.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under-25">Under $25</SelectItem>
                  <SelectItem value="25-35">$25 - $35</SelectItem>
                  <SelectItem value="over-35">Over $35</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-t-lg" />
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-muted-foreground">
                {filteredProducts.length} products found
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const productVariants = getProductVariants(product.id)
                const lowestPrice = getLowestPrice(product.id)
                const hasReadyToShip = productVariants.some(v => v.ready_to_ship)
                
                return (
                  <Card key={product.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
                    <div className="aspect-square overflow-hidden rounded-t-lg bg-muted relative">
                      <img 
                        src={product.thumbnail_url} 
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg'
                        }}
                      />
                      {hasReadyToShip && (
                        <Badge className="absolute top-2 right-2" variant="secondary">
                          Ready to Ship
                        </Badge>
                      )}
                    </div>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <div className="text-right">
                          {lowestPrice && lowestPrice < product.default_price ? (
                            <div>
                              <div className="text-sm text-muted-foreground line-through">
                                ${product.default_price}
                              </div>
                              <Badge variant="secondary">
                                From ${lowestPrice}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="secondary">
                              ${product.default_price}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {product.description}
                      </CardDescription>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {[...new Set(productVariants.map(v => v.material))].map(material => (
                          <Badge key={material} variant="outline" className="text-xs">
                            {material}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" asChild>
                        <Link to={`/customize/classic?product=${product.slug}`}>
                          Customize Now
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  No products found matching your criteria.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('')
                    setMaterialFilter('all')
                    setPriceFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Catalog