import { useState, useEffect } from 'react'
import { fetchTask } from '@/lib/genTasks'

export interface GenerationTask {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'DELETED'
  progress?: number
  model_glb_url?: string
  thumbnail_url?: string
  user_id: string
  error?: { message: string }
}

export function useTaskPoller(taskId?: string) {
  const [task, setTask] = useState<GenerationTask | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  useEffect(() => {
    if (!taskId) return

    let interval: NodeJS.Timeout
    setIsPolling(true)

    const pollTask = async () => {
      try {
        const data = await fetchTask(taskId)
        setTask(data as GenerationTask)

        if (['SUCCEEDED', 'FAILED', 'DELETED'].includes(data.status)) {
          clearInterval(interval)
          setIsPolling(false)
        }
      } catch (error) {
        console.error('Failed to poll task:', error)
      }
    }

    pollTask()
    interval = setInterval(pollTask, 2500)

    return () => {
      clearInterval(interval)
      setIsPolling(false)
    }
  }, [taskId])

  return { task, isPolling }
}
