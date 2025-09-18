import { supabase } from '@/integrations/supabase/client'
import { CATALOG_ITEMS } from './catalog'
import type { CatalogItem } from './catalog'

export const getItemById = (id: string): CatalogItem | undefined => {
  return CATALOG_ITEMS.find(item => item.id === id)
}

export const getSignedUrl = async (path: string, bucket: string = 'design-models'): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60) // 60 seconds

    if (error) {
      console.error('Error creating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Error in getSignedUrl:', error)
    return null
  }
}

export const uploadPreview = async (
  file: Blob, 
  filename: string,
  bucket: string = 'design-files'
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(`previews/${filename}`, file, {
        contentType: 'image/png',
        upsert: true
      })

    if (error) {
      console.error('Error uploading preview:', error)
      return null
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return publicData.publicUrl
  } catch (error) {
    console.error('Error in uploadPreview:', error)
    return null
  }
}

export const captureCanvasScreenshot = (canvas: HTMLCanvasElement): Promise<Blob | null> => {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob)
    }, 'image/png', 0.8)
  })
}