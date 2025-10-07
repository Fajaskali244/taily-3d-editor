// Catalog thumbnail URL resolver for Supabase Storage
const SUPABASE_URL = "https://npvkyiujvxyrrqdyrhas.supabase.co"
const BUCKET = "catalog_thumbs"
const FALLBACK_IMG = "/placeholder.svg"

/**
 * Resolves catalog thumbnail paths to public Supabase Storage URLs.
 * Accepts absolute URLs or relative paths (e.g., "rings/basic-keyring.png")
 * and normalizes them to public storage URLs.
 */
export function catalogThumbUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return FALLBACK_IMG
  
  const path = String(pathOrUrl)
  
  // If already an absolute HTTP(S) URL, return as-is
  if (/^https?:\/\//i.test(path)) return path
  
  // Normalize path: strip common prefixes
  let normalized = path.replace(/^\/+/, "")
  normalized = normalized.replace(/^src\/assets\//, "")
  normalized = normalized.replace(/^public\//, "")
  
  // Build public storage URL
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${normalized}`
}

export const FALLBACK_IMAGE = FALLBACK_IMG
