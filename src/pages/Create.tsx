import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import UploadDropzone from '../components/UploadDropzone'
import TextPromptForm from '../components/TextPromptForm'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { EDGE_FN_BASE } from '../config'

export default function Create() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const tab = params.get('tab') ?? 'image'

  async function createTask(body: any) {
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No valid session')
      }

      const res = await fetch(`${EDGE_FN_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ...body, userId: user.id })
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create task')
      }

      toast({
        title: 'Generation started',
        description: 'Your 3D model is being created...'
      })
      
      // Navigate with the actual task ID returned from the function
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
      <div className="max-w-4xl mx-auto p-6 space-y-6">
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

          <TabsContent value="image" className="space-y-4 mt-6">
            <UploadDropzone 
              onUploaded={url => createTask({ source: 'image', imageUrl: url })} 
            />
            <p className="text-sm text-muted-foreground">
              Upload an image and we'll generate a 3D model from it automatically.
            </p>
          </TabsContent>

          <TabsContent value="text" className="space-y-4 mt-6">
            <TextPromptForm 
              onSubmit={prompt => createTask({ source: 'text', prompt })} 
            />
            <p className="text-sm text-muted-foreground">
              Describe what you want to create and AI will generate a 3D model.
            </p>
          </TabsContent>
        </Tabs>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">
              Starting generation...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
