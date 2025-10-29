import { useEffect, useState } from 'react'
import { useGenerationTask } from '@/hooks/useGenerationTask'
import { Progress } from '@/components/ui/progress'

export function GenerationProgress({ 
  taskId, 
  onSignedGlb 
}: { 
  taskId: string
  onSignedGlb?: (url?: string) => void 
}) {
  const { task, isLoading } = useGenerationTask(taskId)

  // Notify parent when GLB is ready
  useEffect(() => {
    if (task?.model_glb_url && onSignedGlb) {
      onSignedGlb(task.model_glb_url)
    }
  }, [task?.model_glb_url, onSignedGlb])

  if (isLoading || !task) {
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
