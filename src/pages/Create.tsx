import { useState, useRef } from 'react'
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

const MAX_FILES = 8;
const MIN_FILE_SIZE = 200 * 1024; // 200 KB

// helper: upload files to private bucket and create signed URLs (30min expiry for probing)
async function toSignedUrls(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("auth required");

  for (const f of files) {
    const path = `${user.id}/${Date.now()}-${f.name}`;
    const up = await supabase.storage.from("user-uploads").upload(path, f, { upsert: false });
    if (up.error) throw up.error;
    const signed = await supabase.storage.from("user-uploads").createSignedUrl(path, 1800); // 30 min for probing
    if (signed.error) throw signed.error;
    urls.push(signed.data.signedUrl);
  }
  return urls;
}

type PickedFile = { file: File; previewUrl: string };

export default function Create() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  
  const [picked, setPicked] = useState<PickedFile[]>([])
  const [imageUrl, setImageUrl] = useState<string>('')
  const [preset, setPreset] = useState<QualityPreset>('standard')
  const [prompt, setPrompt] = useState<string>('')
  const [forceSmall, setForceSmall] = useState(false)
  
  const tab = params.get('tab') ?? 'image'

  const handleFiles = (filesList: FileList | null) => {
    if (!filesList) return;
    const files = Array.from(filesList);
    const validated: PickedFile[] = [];

    for (const f of files) {
      if (!f.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: `"${f.name}" is not an image file`,
          variant: 'destructive'
        });
        continue;
      }
      if (!forceSmall && f.size < MIN_FILE_SIZE) {
        toast({
          title: 'File too small',
          description: `"${f.name}" must be ≥ 200 KB. Enable "Force generate anyway" to override.`,
          variant: 'destructive'
        });
        continue;
      }
      if (picked.length + validated.length >= MAX_FILES) {
        toast({
          title: 'Max files reached',
          description: `Maximum ${MAX_FILES} images allowed`,
          variant: 'destructive'
        });
        break;
      }
      validated.push({ file: f, previewUrl: URL.createObjectURL(f) });
    }

    setPicked(prev => [...prev, ...validated].slice(0, MAX_FILES));
  };

  const removeFile = (idx: number) => {
    setPicked(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const clearAllFiles = () => {
    picked.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPicked([]);
  };

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
      const filesToUpload = picked.map(p => p.file);
      const uploadedUrls = filesToUpload.length ? await toSignedUrls(filesToUpload) : []
      
      // Build payload: send imageUrl for single image, imageUrls for multiple
      let payload: any = {
        texturePrompt: prompt,
        preset,
        forceSmall: forceSmall ? true : undefined
      };
      
      if (uploadedUrls.length > 1) {
        payload.imageUrls = uploadedUrls;
      } else if (uploadedUrls.length === 1) {
        payload.imageUrl = uploadedUrls[0];
      } else if (imageUrl.trim()) {
        payload.imageUrl = imageUrl.trim();
      } else {
        throw new Error("Provide at least one image");
      }

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
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
                <div
                  className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                  }}
                >
                  <div className="text-4xl mb-2">📷</div>
                  <div className="font-medium">Choose files or drag & drop</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    PNG/JPG, ≥ 200 KB each, max {MAX_FILES} files
                  </div>
                </div>
              </div>

              {picked.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {picked.length} file{picked.length > 1 ? 's' : ''} selected
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFiles}
                      className="text-xs"
                    >
                      Clear all
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {picked.map((p, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-border">
                        <img src={p.previewUrl} className="w-full h-full object-cover" alt={`Preview ${i + 1}`} />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded hover:bg-destructive/90"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground">
                {picked.length > 0 ? 'or' : 'alternatively, paste a single image URL below'}
              </div>

              <div className="space-y-2">
                <Label>Single image URL</Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={picked.length > 0}
                />
                {picked.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Multiple files selected; the pasted URL will be ignored.
                  </p>
                )}
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
                  onChange={(e) => setPrompt(e.target.value.slice(0, 800))}
                  placeholder="e.g., glossy white paint, crisp decals, realistic tires"
                  maxLength={800}
                />
                {prompt.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {prompt.length}/800 characters
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <input
                  type="checkbox"
                  id="forceSmall"
                  checked={forceSmall}
                  onChange={(e) => setForceSmall(e.target.checked)}
                  className="cursor-pointer"
                />
                <Label htmlFor="forceSmall" className="cursor-pointer text-sm text-muted-foreground">
                  Force generate anyway (bypass size checks)
                </Label>
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={loading || (!picked.length && !imageUrl.trim())}
                className="w-full"
              >
                {loading ? 'Uploading & generating...' : 'Generate 3D Model'}
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
                  onChange={(e) => setPrompt(e.target.value.slice(0, 800))}
                  placeholder="A detailed fantasy warrior miniature..."
                  maxLength={800}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && prompt.trim()) {
                      handleTextPrompt(prompt)
                    }
                  }}
                />
                {prompt.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {prompt.length}/800 characters
                  </p>
                )}
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
