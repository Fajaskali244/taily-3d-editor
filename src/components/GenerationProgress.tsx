import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { fetchTask } from '@/lib/genTasks'

interface GenerationTask {
  id: string
  status: string
  progress?: number
  thumbnail_url?: string
  storage_glb_signed_url?: string
  error?: any
}

export function GenerationProgress({ 
  taskId, 
  onSignedGlb 
}: { 
  taskId: string
  onSignedGlb?: (url?: string) => void 
}) {
  const [task, setTask] = useState<GenerationTask | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const pollTask = async () => {
      try {
        const data = await fetchTask(taskId)
        setTask(data)
        
        if (data.storage_glb_signed_url && onSignedGlb) {
          onSignedGlb(data.storage_glb_signed_url)
        }
        
        if (['SUCCEEDED', 'FAILED', 'DELETED'].includes(data.status)) {
          clearInterval(interval)
        }
      } catch (error) {
        console.error('Failed to poll task:', error)
      }
    }

    pollTask()
    interval = setInterval(pollTask, 2500)
    return () => clearInterval(interval)
  }, [taskId, onSignedGlb])

  if (!task) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded bg-muted animate-pulse" />
        <div className="grow space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-32" />
          <div className="h-2 bg-muted rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-20 h-20 rounded bg-muted overflow-hidden border">
        {task.thumbnail_url && (
          <img 
            src={task.thumbnail_url} 
            alt="Preview" 
            className="w-full h-full object-cover" 
          />
        )}
      </div>
      <div className="grow space-y-2">
        <div className="font-medium">
          {task.status}
          {task.progress !== undefined && ` · ${task.progress}%`}
        </div>
        <Progress value={task.progress ?? 0} className="h-2" />
        {task.status === 'FAILED' && task.error && (
          <p className="text-sm text-destructive">
            Generation failed. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}
