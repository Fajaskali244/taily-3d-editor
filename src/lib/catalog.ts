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
  {
    id: 'keyring-round',
    kind: 'keyring',
    name: 'Round Keyring',
    price: 30000,
    glbPath: '/models/keyring-round.glb',
    thumbnail: '/src/assets/round-keyring.png',
    height: 2,
    tags: ['round', 'metal', 'simple']
  },
  {
    id: 'keyring-carabiner',
    kind: 'keyring',
    name: 'Carabiner Keyring',
    price: 40000,
    glbPath: '/models/keyring-carabiner.glb',
    thumbnail: '/src/assets/carabiner-keyring.png',
    height: 3,
    tags: ['carabiner', 'metal', 'secure']
  },

  // Beads
  {
    id: 'bead-pink-cat-eye',
    kind: 'bead',
    name: 'Pink Cat Eye Bead',
    price: 8000,
    glbPath: '/models/beads/pink-cat-eye.glb',
    thumbnail: '/src/assets/pink-cat-eye-bead.png',
    height: 12,
    tags: ['cat eye', 'pink', 'stone']
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
    id: 'bead-sports-collection',
    kind: 'bead',
    name: 'Sports Beads Collection',
    price: 11000,
    glbPath: '/models/beads/sports-collection.glb',
    thumbnail: '/src/assets/sports-beads-collection.png',
    height: 12,
    tags: ['sports', 'basketball', 'soccer', 'baseball', 'football']
  },
  {
    id: 'bead-black-cat',
    kind: 'bead',
    name: 'Black Cat Bead',
    price: 13000,
    glbPath: '/models/beads/black-cat.glb',
    thumbnail: '/src/assets/black-cat-bead.png',
    height: 15,
    tags: ['cat', 'animal', 'black', 'blue eyes']
  },
  {
    id: 'bead-blue-flower',
    kind: 'bead',
    name: 'Blue Flower Bead',
    price: 10000,
    glbPath: '/models/beads/blue-flower.glb',
    thumbnail: '/src/assets/blue-flower-bead.png',
    height: 12,
    tags: ['flower', 'blue', 'nature']
  },
  {
    id: 'bead-crescent-moon',
    kind: 'bead',
    name: 'Crescent Moon Beads',
    price: 9000,
    glbPath: '/models/beads/crescent-moon.glb',
    thumbnail: '/src/assets/crescent-moon-beads.png',
    height: 10,
    tags: ['moon', 'crescent', 'celestial', 'blue', 'gold']
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
    thumbnail: '/src/assets/star-charm-new.png',
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
  },
  {
    id: 'charm-four-point-star',
    kind: 'charm',
    name: 'Four-Point Star Charm',
    price: 16000,
    glbPath: '/models/charms/four-point-star.glb',
    thumbnail: '/src/assets/star-charm-four-point.png',
    height: 9,
    tags: ['star', 'four-point', 'celestial', 'elegant']
  },
  {
    id: 'charm-dripping-heart',
    kind: 'charm',
    name: 'Dripping Heart Charm',
    price: 20000,
    glbPath: '/models/charms/dripping-heart.glb',
    thumbnail: '/src/assets/dripping-heart-charm.png',
    height: 12,
    tags: ['heart', 'dripping', 'black', 'gothic', 'edgy']
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