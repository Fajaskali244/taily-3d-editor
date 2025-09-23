export type ItemKind = 'keyring' | 'bead' | 'charm'

export interface CatalogItem {
  id: string
  kind: ItemKind
  name: string
  price: number
  glbPath: string
  thumbnail: string
  height?: number // For stacking calculations (in mm)
  tags?: string[]
}

export interface PlacedItem {
  uid: string
  catalogId: string
  kind: ItemKind
  positionIndex: number
  rotation?: [number, number, number]
  color?: string
}

// Static catalog - later can be fetched from Supabase
export const CATALOG_ITEMS: CatalogItem[] = [
  // Keyrings
  {
    id: 'keyring-basic',
    kind: 'keyring',
    name: 'Basic Keyring',
    price: 25000,
    glbPath: '/models/keyring.glb',
    thumbnail: '/src/assets/basic-keyring-new.png',
    height: 2,
    tags: ['basic', 'metal']
  },
  {
    id: 'keyring-premium',
    kind: 'keyring', 
    name: 'Premium Keyring',
    price: 35000,
    glbPath: '/models/keyring-premium.glb',
    thumbnail: '/src/assets/premium-keyring-new.png',
    height: 2.5,
    tags: ['premium', 'metal', 'gold']
  },

  // Beads
  {
    id: 'bead-black-pattern',
    kind: 'bead',
    name: 'Black Pattern Bead',
    price: 8000,
    glbPath: '/models/beads/black-pattern.glb',
    thumbnail: '/lovable-uploads/black-pattern-beads.jpg',
    height: 12,
    tags: ['pattern', 'black', 'geometric']
  },
  {
    id: 'bead-blue-glitter',
    kind: 'bead',
    name: 'Blue Glitter Bead',
    price: 10000,
    glbPath: '/models/beads/blue-glitter.glb',
    thumbnail: '/src/assets/blue-glitter-beads-new.png',
    height: 12,
    tags: ['glitter', 'blue', 'sparkle']
  },
  {
    id: 'bead-owl',
    kind: 'bead',
    name: 'Owl Face Bead',
    price: 12000,
    glbPath: '/models/beads/owl.glb',
    thumbnail: '/src/assets/owl-face-bead-new.png',
    height: 15,
    tags: ['owl', 'animal', 'cute']
  },
  {
    id: 'bead-sports',
    kind: 'bead',
    name: 'Sports Bead',
    price: 9000,
    glbPath: '/models/beads/sports.glb',
    thumbnail: '/src/assets/sports-beads-new.png',
    height: 12,
    tags: ['sports', 'ball', 'activity']
  },

  // Charms
  {
    id: 'charm-heart',
    kind: 'charm',
    name: 'Heart Charm',
    price: 15000,
    glbPath: '/models/charms/heart.glb',
    thumbnail: '/src/assets/heart-charm-new.png',
    height: 8,
    tags: ['heart', 'love', 'cute']
  },
  {
    id: 'charm-star',
    kind: 'charm',
    name: 'Star Charm',
    price: 15000,
    glbPath: '/models/charms/star.glb',
    thumbnail: '/lovable-uploads/star-charm.jpg',
    height: 8,
    tags: ['star', 'celestial', 'shine']
  },
  {
    id: 'charm-moon',
    kind: 'charm',
    name: 'Moon Charm',
    price: 18000,
    glbPath: '/models/charms/moon.glb',
    thumbnail: '/src/assets/moon-charm-new.png',
    height: 10,
    tags: ['moon', 'celestial', 'crescent']
  }
]

export const getItemsByKind = (kind: ItemKind): CatalogItem[] => {
  return CATALOG_ITEMS.filter(item => item.kind === kind)
}

export const searchItems = (query: string): CatalogItem[] => {
  const lowercaseQuery = query.toLowerCase()
  return CATALOG_ITEMS.filter(item => 
    item.name.toLowerCase().includes(lowercaseQuery) ||
    item.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  )
}

export const getItemById = (id: string): CatalogItem | undefined => {
  return CATALOG_ITEMS.find(item => item.id === id)
}