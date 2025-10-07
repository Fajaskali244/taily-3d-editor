// Catalog thumbnail URL resolver for Supabase Storage
import { supabase } from "@/integrations/supabase/client"

const BUCKET = "catalog_thumbs"
const FALLBACK_IMG = "/placeholder.svg"

/**
 * Normalizes a thumbnail path by stripping common prefixes.
 * Converts paths like "/src/assets/basic-keyring.png" to "basic-keyring.png"
 */
function toBucketPath(thumbnail?: string | null): string | null {
  if (!thumbnail) return null
  let p = String(thumbnail).trim()
  p = p.replace(/^\/+/, "")              // remove leading slashes
  p = p.replace(/^src\/assets\//, "")    // "src/assets/foo.png" -> "foo.png"
  p = p.replace(/^public\//, "")         // "public/foo.png" -> "foo.png"
  return p
}

/**
 * Resolves catalog thumbnail paths to public Supabase Storage URLs.
 * Accepts absolute URLs or relative paths (e.g., "rings/basic-keyring.png")
 * and returns a stable absolute URL using Supabase's getPublicUrl API.
 */
export function catalogThumbUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return FALLBACK_IMG
  
  const path = String(pathOrUrl)
  
  // If already an absolute HTTP(S) URL, return as-is
  if (/^https?:\/\//i.test(path)) return path
  
  // Normalize path and get public URL from Supabase
  const bucketPath = toBucketPath(path)
  if (!bucketPath) return FALLBACK_IMG
  
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(bucketPath)
  return data.publicUrl || FALLBACK_IMG
}

export const FALLBACK_IMAGE = FALLBACK_IMG
