import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Package, Circle, Star, KeyRound } from 'lucide-react'
import { fetchCatalogItems, getItemsByKind, searchItems } from '@/lib/catalog'
import type { CatalogItem, ItemKind } from '@/lib/catalog'
import { catalogThumbUrl, FALLBACK_IMAGE } from '@/lib/catalogThumbs'

interface SelectionPanelProps {
  onItemClick: (item: CatalogItem) => void
  onDragStart: (item: CatalogItem) => void
  onDragEnd: () => void
}

const ItemCard = ({ 
  item, 
  onClick, 
  onDragStart, 
  onDragEnd 
}: { 
  item: CatalogItem
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item))
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart()
  }

  const getKindIcon = () => {
    switch (item.kind) {
      case 'keyring':
        return <KeyRound className="h-3 w-3" />
      case 'bead':
        return <Circle className="h-3 w-3" />
      case 'charm':
        return <Star className="h-3 w-3" />
      default:
        return <Package className="h-3 w-3" />
    }
  }

  const getKindColor = () => {
    switch (item.kind) {
      case 'keyring':
        return 'bg-blue-500'
      case 'bead':
        return 'bg-green-500'
      case 'charm':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-grab active:cursor-grabbing h-full"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <CardContent className="p-3 h-full flex flex-col">
        {/* Thumbnail */}
        <div className="aspect-square mb-2 overflow-hidden rounded-lg bg-gray-50 relative">
          <img 
            src={catalogThumbUrl(item.thumbnail)} 
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          
          {/* Kind indicator */}
          <div className={`absolute top-2 left-2 ${getKindColor()} text-white rounded-full p-1`}>
            {getKindIcon()}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <h4 className="font-medium text-sm mb-1 text-center truncate flex-1">
            {item.name}
          </h4>
          <p className="text-xs text-primary font-semibold text-center">
            IDR {item.price.toLocaleString()}
          </p>
          
          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {item.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export const SelectionPanel = ({ onItemClick, onDragStart, onDragEnd }: SelectionPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [filteredItems, setFilteredItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const items = await fetchCatalogItems()
        setCatalogItems(items)
        setFilteredItems(items)
      } catch (error) {
        console.error('Failed to load catalog:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCatalog()
  }, [])

  useEffect(() => {
    const updateFilteredItems = async () => {
      let items = catalogItems

      // Filter by kind first
      if (activeTab !== 'all') {
        items = items.filter(item => item.kind === activeTab)
      }

      // Then filter by search
      if (searchQuery.trim()) {
        const lowercaseQuery = searchQuery.toLowerCase()
        items = items.filter(item => 
          item.name.toLowerCase().includes(lowercaseQuery) ||
          item.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
        )
      }

      setFilteredItems(items)
    }
    updateFilteredItems()
  }, [searchQuery, activeTab, catalogItems])

  if (loading) {
    return (
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catalog Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div>Loading catalog...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Item Selection
        </CardTitle>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden px-4 pb-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="keyring" className="text-xs">Rings</TabsTrigger>
            <TabsTrigger value="bead" className="text-xs">Beads</TabsTrigger>
            <TabsTrigger value="charm" className="text-xs">Charms</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value={activeTab} className="mt-0 h-full">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Package className="h-8 w-8 mb-2" />
                  <p className="text-sm">No items found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                  {filteredItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onClick={() => onItemClick(item)}
                      onDragStart={() => onDragStart(item)}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            💡 <strong>Drag & drop</strong> items onto the canvas or <strong>click</strong> to add
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            🗑️ <strong>Shift + click</strong> items in 3D to remove
          </p>
        </div>
      </CardContent>
    </Card>
  )
}