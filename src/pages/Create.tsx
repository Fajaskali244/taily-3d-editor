import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { createMeshyTask, createMeshyTaskFromText, QualityPreset } from '@/lib/genTasks'
import { supabase } from '@/integrations/supabase/client'
import Navigation from '@/components/Navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

// helper: upload files to private bucket and create short signed URLs
async function toSignedUrls(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth required");

  for (const f of files) {
    const path = `${user.id}/${Date.now()}-${f.name}`;
    const up = await supabase.storage.from("user-uploads").upload(path, f, { upsert: false });
    if (up.error) throw up.error;
    const signed = await supabase.storage.from("user-uploads").createSignedUrl(path, 3600);
    if (signed.error) throw signed.error;
    urls.push(signed.data.signedUrl);
  }
  return urls;
}

export default function Create() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [files, setFiles] = useState<File[]>([])
  const [imageUrl, setImageUrl] = useState<string>('')
  const [preset, setPreset] = useState<QualityPreset>('standard')
  const [prompt, setPrompt] = useState<string>('')
  
  const tab = params.get('tab') ?? 'image'

  async function handleSubmit() {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to generate 3D models',
        variant: 'destructive'
      })
      nav('/auth')
      return
    }

    setLoading(true)
    try {
      const uploadedUrls = files.length ? await toSignedUrls(files) : undefined
      const payload = uploadedUrls?.length
        ? { imageUrls: uploadedUrls, texturePrompt: prompt, preset }
        : { imageUrl, texturePrompt: prompt, preset }

      const { id } = await createMeshyTask(payload as any)
      
      toast({
        title: 'Generation started',
        description: 'Your 3D model is being created...'
      })
      
      nav(`/review/${id}`)
    } catch (error) {
      console.error('Task creation error:', error)
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleTextPrompt(promptText: string) {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to generate 3D models',
        variant: 'destructive'
      })
      nav('/auth')
      return
    }

    setLoading(true)
    try {
      const data = await createMeshyTaskFromText(promptText, preset)
      
      toast({
        title: 'Generation started',
        description: 'Your 3D model is being created...'
      })
      
      nav(`/review/${data.id}`)
    } catch (error) {
      console.error('Task creation error:', error)
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto p-6 pt-24 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create your 3D model</h1>
          <p className="text-muted-foreground mt-2">
            Generate a 3D model from an image or text description
          </p>
        </div>

        <Tabs value={tab} onValueChange={v => setParams({ tab: v })}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image">From Image</TabsTrigger>
            <TabsTrigger value="text">From Text</TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Upload multiple angles (3–5 images recommended)</Label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  className="cursor-pointer"
                />
                {files.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {files.length} file{files.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <div className="text-center text-sm text-muted-foreground">
                or paste a single image URL below
              </div>

              <div className="space-y-2">
                <Label>Single image URL</Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Quality</Label>
                <select 
                  className="w-full border rounded-md p-2 bg-background"
                  value={preset} 
                  onChange={(e) => setPreset(e.target.value as QualityPreset)}
                >
                  <option value="draft">Draft (fastest, ~120k poly)</option>
                  <option value="standard">Standard (~220k poly)</option>
                  <option value="high">High (best quality, ~350k poly)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Texture prompt (optional)</Label>
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., glossy white paint, crisp decals, realistic tires"
                />
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={loading || (!files.length && !imageUrl.trim())}
                className="w-full"
              >
                {loading ? 'Starting...' : 'Generate 3D Model'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Quality</Label>
                <select 
                  className="w-full border rounded-md p-2 bg-background"
                  value={preset} 
                  onChange={(e) => setPreset(e.target.value as QualityPreset)}
                >
                  <option value="draft">Draft (fastest)</option>
                  <option value="standard">Standard</option>
                  <option value="high">High (best quality)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Describe your model</Label>
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A detailed fantasy warrior miniature..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && prompt.trim()) {
                      handleTextPrompt(prompt)
                    }
                  }}
                />
              </div>

              <Button 
                onClick={() => handleTextPrompt(prompt)} 
                disabled={loading || !prompt.trim()}
                className="w-full"
              >
                {loading ? 'Starting...' : 'Generate 3D Model'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
