import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MeshyModelPreview from '../components/MeshyModelPreview'
import { GenerationProgress } from '../components/GenerationProgress'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface Task {
  id: string
  status: string
  model_glb_url?: string
  user_id: string
}

export default function Review() {
  const { taskId } = useParams()
  const nav = useNavigate()
  const { toast } = useToast()
  const [task, setTask] = useState<Task | null>(null)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    const pollTask = async () => {
      try {
        const res = await fetch(`http://localhost:8787/api/meshy/tasks/${taskId}`)
        if (res.ok) {
          const data = await res.json()
          setTask(data)
          if (['SUCCEEDED', 'FAILED', 'DELETED'].includes(data.status)) {
            clearInterval(interval)
          }
        }
      } catch (error) {
        console.error('Poll error:', error)
      }
    }

    pollTask()
    const interval = setInterval(pollTask, 2500)
    return () => clearInterval(interval)
  }, [taskId])

  async function handleApprove() {
    if (!task?.model_glb_url) return

    setApproving(true)
    try {
      // Create or update design with the generated GLB
      const { data: design, error: designError } = await supabase
        .from('designs')
        .insert({
          user_id: task.user_id,
          name: 'AI Generated Model',
          params: { source: 'meshy', task_id: task.id },
          preview_url: task.model_glb_url,
          is_published: true
        })
        .select()
        .single()

      if (designError) throw designError

      // Log approval event
      await supabase.from('events_analytics').insert({
        event: 'approve_for_print',
        user_id: task.user_id,
        design_id: design.id,
        props: { task_id: task.id }
      })

      toast({
        title: 'Model approved!',
        description: 'Your 3D model has been saved to your designs.'
      })

      nav('/my-designs')
    } catch (error) {
      console.error('Approval error:', error)
      toast({
        title: 'Approval failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Review your 3D model</h1>
          <p className="text-muted-foreground mt-2">
            Wait for generation to complete, then approve for printing
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h2 className="font-semibold mb-4">Generation Progress</h2>
              {taskId && <GenerationProgress taskId={taskId} />}
            </div>
            
            {task?.status === 'FAILED' && (
              <div className="border border-destructive rounded-lg p-4 bg-destructive/10">
                <h3 className="font-semibold text-destructive">Generation Failed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Something went wrong during generation. Please try again.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => nav('/create')}
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>

          <div>
            <MeshyModelPreview glbUrl={task?.model_glb_url} />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            disabled={!task?.model_glb_url || approving}
            onClick={handleApprove}
            size="lg"
          >
            {approving ? 'Approving...' : 'Approve for Print'}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={() => nav('/create')}
          >
            Create New Model
          </Button>
        </div>

        {!task?.model_glb_url && task?.status !== 'FAILED' && (
          <p className="text-sm text-muted-foreground text-center">
            Your model will appear above once generation is complete
          </p>
        )}
      </div>
    </div>
  )
}
