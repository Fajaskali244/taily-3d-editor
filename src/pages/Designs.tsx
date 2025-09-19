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

const Designs = () => {
  const [designs, setDesigns] = useState<ReferenceDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [featuredFilter, setFeaturedFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')

  useEffect(() => {
    fetchDesigns()
  }, [])

  const fetchDesigns = async () => {
    try {
      const { data, error } = await supabase
        .from('reference_designs')
        .select('id, slug, title, description, preview_url, thumb_url, tags, is_featured')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching reference designs:', error)
      } else {
        setDesigns(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDesigns = designs.filter(design => {
    const matchesSearch = design.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (design.description && design.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesFeatured = featuredFilter === 'all' || 
                           (featuredFilter === 'featured' && design.is_featured) ||
                           (featuredFilter === 'regular' && !design.is_featured)
    
    const matchesTag = tagFilter === 'all' || 
                      (design.tags && design.tags.includes(tagFilter))
    
    return matchesSearch && matchesFeatured && matchesTag
  })

  // Get all unique tags for filter
  const allTags = designs.reduce((tags: string[], design) => {
    if (design.tags) {
      design.tags.forEach(tag => {
        if (!tags.includes(tag)) {
          tags.push(tag)
        }
      })
    }
    return tags
  }, []).sort()

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
            Design Gallery
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Browse our collection of reference designs and get inspired for your next custom keychain
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
                  placeholder="Search designs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Featured Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Designs</SelectItem>
                  <SelectItem value="featured">Featured Only</SelectItem>
                  <SelectItem value="regular">Regular Designs</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Designs Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(12)].map((_, i) => (
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
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-muted-foreground">
                {filteredDesigns.length} designs found
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDesigns.map((design) => {
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
                          {design.tags.map((tag, index) => (
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
            
            {filteredDesigns.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  No designs found matching your criteria.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('')
                    setFeaturedFilter('all')
                    setTagFilter('all')
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

export default Designs