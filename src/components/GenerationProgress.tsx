import { Progress } from "@/components/ui/progress";
import { Json } from "@/integrations/supabase/types";

interface GenerationTask {
  status: string;
  progress?: number | null;
  thumbnail_url?: string | null;
  error?: Json | null;
}

interface GenerationProgressProps {
  task: GenerationTask;
}

export function GenerationProgress({ task }: GenerationProgressProps) {
  const progressPercentage = task.progress ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {task.thumbnail_url ? (
            <img
              src={task.thumbnail_url}
              alt="Generation thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted animate-pulse" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {task.status}
            </span>
            <span className="text-sm text-muted-foreground">
              {progressPercentage}%
            </span>
          </div>

          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>

      {task.error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          Error: {typeof task.error === 'object' ? JSON.stringify(task.error) : String(task.error)}
        </div>
      )}
    </div>
  );
}
