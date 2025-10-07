import { supabase } from "@/integrations/supabase/client"

export type ItemKind = 'keyring' | 'bead' | 'charm'

export interface CatalogItem {
  id: string
  kind: ItemKind
  name: string
  price: number
  glbPath: string
  thumbnail: string
  thumbnail_url?: string | null
  thumbnail_path?: string | null
  height?: number // For stacking calculations (in mm)
  tags?: string[]
  slug?: string
}

export interface PlacedItem {
  uid: string
  catalogId: string
  kind: ItemKind
  positionIndex: number
  rotation?: [number, number, number]
  color?: string
}

// Cache for catalog items
let catalogCache: CatalogItem[] | null = null

// Transform Supabase data to our CatalogItem interface
const transformCatalogItem = (item: any): CatalogItem => ({
  id: item.id,
  kind: item.kind as ItemKind,
  name: item.name,
  price: item.price,
  glbPath: item.glb_path,
  thumbnail: item.thumbnail,
  thumbnail_url: item.thumbnail_url,
  thumbnail_path: item.thumbnail_path,
  height: item.height_mm,
  tags: item.tags || [],
  slug: item.slug
})

// Fetch catalog items from Supabase
export const fetchCatalogItems = async (): Promise<CatalogItem[]> => {
  if (catalogCache) {
    return catalogCache
  }

  const { data, error } = await supabase
    .from('catalog_items')
    .select('id, kind, name, price, glb_path, thumbnail, thumbnail_url, thumbnail_path, height_mm, tags, slug')
    .order('kind')
    .order('price')

  if (error) {
    console.error('Error fetching catalog items:', error)
    return []
  }

  catalogCache = data.map(transformCatalogItem)
  return catalogCache
}

// Clear cache to force refresh
export const clearCatalogCache = () => {
  catalogCache = null
}

export const getItemsByKind = async (kind: ItemKind): Promise<CatalogItem[]> => {
  const items = await fetchCatalogItems()
  return items.filter(item => item.kind === kind)
}

export const searchItems = async (query: string): Promise<CatalogItem[]> => {
  const items = await fetchCatalogItems()
  const lowercaseQuery = query.toLowerCase()
  return items.filter(item => 
    item.name.toLowerCase().includes(lowercaseQuery) ||
    item.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  )
}

export const getItemById = async (id: string): Promise<CatalogItem | undefined> => {
  const items = await fetchCatalogItems()
  return items.find(item => item.id === id)
}

export const getItemBySlug = async (slug: string): Promise<CatalogItem | undefined> => {
  const items = await fetchCatalogItems()
  return items.find(item => item.slug === slug)
}