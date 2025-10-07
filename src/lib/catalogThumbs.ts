// Catalog thumbnail URL resolver for Supabase Storage
import { supabase } from "@/integrations/supabase/client"

const BUCKET = "catalog_thumbs"
const FALLBACK_IMG = "/placeholder.svg"

/**
 * Normalize any DB value into a Storage key:
 * - Absolute Supabase public URL -> key
 * - "/src/assets/foo.png" or "public/foo.png" -> "foo.png"
 * - leading "/" removed
 */
export function normalizeThumbPath(v?: string | null): string | null {
  if (!v) return null
  let s = String(v).trim()
  
  // If they saved a full Supabase public URL, strip to the key portion
  const m = s.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/i)
  if (m) s = m[1]
  
  s = s.replace(/^\/+/, "")              // remove leading slashes
  s = s.replace(/^src\/assets\//, "")    // "src/assets/foo.png" -> "foo.png"
  s = s.replace(/^public\//, "")         // "public/foo.png" -> "foo.png"
  return s || null
}

/**
 * Prefer DB's thumbnail_url; else build a public URL from (thumbnail_path || thumbnail).
 * Supports multiple column formats for backward compatibility.
 */
export function resolveThumbUrl(row: {
  thumbnail_url?: string | null
  thumbnail_path?: string | null
  thumbnail?: string | null
}): string {
  // If thumbnail_url is already a full URL, use it
  if (row?.thumbnail_url && /^https?:\/\//i.test(row.thumbnail_url)) {
    return row.thumbnail_url
  }
  
  // Try to get a key from thumbnail_path or thumbnail
  const key = normalizeThumbPath(row?.thumbnail_path ?? row?.thumbnail ?? null)
  if (!key) return FALLBACK_IMG
  
  const { publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(key).data
  return publicUrl || FALLBACK_IMG
}

/**
 * Legacy resolver for backward compatibility.
 * Resolves catalog thumbnail paths to public Supabase Storage URLs.
 */
export function catalogThumbUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return FALLBACK_IMG
  
  const path = String(pathOrUrl)
  
  // If already an absolute HTTP(S) URL, return as-is
  if (/^https?:\/\//i.test(path)) return path
  
  // Normalize path and get public URL from Supabase
  const bucketPath = normalizeThumbPath(path)
  if (!bucketPath) return FALLBACK_IMG
  
  const { publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(bucketPath).data
  return publicUrl || FALLBACK_IMG
}

export const FALLBACK_IMAGE = FALLBACK_IMG

/**
 * Format a number as Indonesian Rupiah (IDR)
 */
export const formatIDR = (n: number): string =>
  new Intl.NumberFormat("id-ID", { 
    style: "currency", 
    currency: "IDR", 
    maximumFractionDigits: 0 
  }).format(Math.round(Number(n || 0)))
