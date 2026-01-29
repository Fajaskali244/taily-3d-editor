/**
 * Stock Models Configuration
 * 
 * These are pre-made 3D models available for direct purchase.
 * Add new models here to make them available in the Gallery and Studio.
 */

export interface StockModel {
  id: string
  name: string
  slug: string
  url: string
  thumbnailUrl?: string
  price: number // in IDR
  category?: string
}

const STORAGE_BASE = 'https://npvkyiujvxyrrqdyrhas.supabase.co/storage/v1/object/public/design-files'
const MODELS_FOLDER = '1ac02421-564b-4201-9675-62316c65f9b7'

export const STOCK_MODELS: StockModel[] = [
  {
    id: 'axolotl',
    name: 'Axolotl',
    slug: 'axolotl',
    url: `${STORAGE_BASE}/${MODELS_FOLDER}/Axolotl.glb`,
    price: 75000,
    category: 'animals'
  },
  {
    id: 'capybara',
    name: 'Capybara',
    slug: 'capybara',
    url: `${STORAGE_BASE}/${MODELS_FOLDER}/Capybara.glb`,
    price: 75000,
    category: 'animals'
  },
  {
    id: 'shiba-inu',
    name: 'Shiba Inu',
    slug: 'shiba-inu',
    url: `${STORAGE_BASE}/${MODELS_FOLDER}/Shiba-Inu.glb`,
    price: 75000,
    category: 'animals'
  },
  {
    id: 'nightfury',
    name: 'Nightfury',
    slug: 'nightfury',
    url: `${STORAGE_BASE}/${MODELS_FOLDER}/Nightfury.glb`,
    price: 85000,
    category: 'fantasy'
  },
  {
    id: 'yeti',
    name: 'Yeti',
    slug: 'yeti',
    url: `${STORAGE_BASE}/${MODELS_FOLDER}/Yeti.glb`,
    price: 85000,
    category: 'fantasy'
  }
]

/**
 * Get a stock model by its slug/id
 */
export function getStockModelBySlug(slug: string): StockModel | undefined {
  return STOCK_MODELS.find(m => m.slug === slug || m.id === slug)
}

/**
 * Get the default stock model
 */
export function getDefaultStockModel(): StockModel {
  return STOCK_MODELS[0]
}

/**
 * Preload URLs for all stock models (for useGLTF.preload)
 */
export function getStockModelUrls(): string[] {
  return STOCK_MODELS.map(m => m.url)
}
