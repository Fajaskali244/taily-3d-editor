import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export default function UploadDropzone({ 
  onUploaded 
}: { 
  onUploaded: (url: string) => void 
}) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, WebP)',
        variant: 'destructive'
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 10MB',
        variant: 'destructive'
      })
      return
    }

    // Must be signed in for secure RLS policies
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to upload images',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      const uid = user.id
      const path = `${uid}/${Date.now()}_${file.name}`
      
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: signedData } = await supabase.storage
        .from('user-uploads')
        .createSignedUrl(path, 60 * 60) // 1 hour validity

      if (signedData?.signedUrl) {
        onUploaded(signedData.signedUrl)
        toast({
          title: 'Upload successful',
          description: 'Starting 3D generation...'
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <label className="border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary transition-colors block text-center">
      <input 
        type="file" 
        accept="image/jpeg,image/png,image/webp" 
        className="hidden" 
        onChange={handleFile}
        disabled={loading}
      />
      <div className="space-y-2">
        <div className="text-4xl">📷</div>
        <div className="font-medium">
          {loading ? 'Uploading...' : 'Choose image'}
        </div>
        <p className="text-sm text-muted-foreground">
          JPG, PNG, or WebP up to 10MB
        </p>
      </div>
    </label>
  )
}
