import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, ArrowLeft, Wand2 } from "lucide-react";
import { useTaskPoller } from "@/hooks/useTaskPoller";
import { GenerationProgress } from "@/components/GenerationProgress";
import ModelViewer from "@/components/ModelViewer";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ReviewPage() {
  const { taskId: raw } = useParams<{ taskId: string }>();
  const taskId = (raw ?? '').replace(/^:/, '');
  const navigate = useNavigate();
  const hasShownSuccessToast = useRef(false);

  const { task, isPolling } = useTaskPoller(UUID_RE.test(taskId) ? taskId : undefined);

  // Auto-show success toast when generation completes
  useEffect(() => {
    if (task?.status === "SUCCEEDED" && task.model_glb_url && !hasShownSuccessToast.current) {
      hasShownSuccessToast.current = true;
      toast.success("Your 3D model is ready!", {
        description: "Customize it into a keychain now!",
        action: {
          label: "Customize",
          onClick: () => navigate(`/studio?taskId=${task.id}`),
        },
        duration: 8000,
      });
    }
  }, [task?.status, task?.model_glb_url, task?.id, navigate]);

  // Invalid task ID
  if (!UUID_RE.test(taskId)) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-5xl mx-auto p-6 pt-24 flex flex-col items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle>Invalid task ID</CardTitle>
              <CardDescription>Please start a new generation.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/create")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Create
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (isPolling && !task) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Task not found
  if (!task) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-5xl mx-auto p-6 pt-24 flex flex-col items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle>Task not found</CardTitle>
              <CardDescription>The generation task could not be found.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/create")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Create
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isSucceeded = task.status === "SUCCEEDED";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-5xl mx-auto p-6 pt-24 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Review your 3D model</h1>
          <p className="text-muted-foreground mt-2">
            Wait for generation to complete, then approve for printing
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Generation Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <GenerationProgress task={task} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              {isSucceeded && task.model_glb_url ? (
                <ModelViewer glbUrl={task.model_glb_url} />
              ) : (
                <div className="aspect-square rounded-xl bg-muted/30 flex items-center justify-center">
                  <p className="text-muted-foreground text-center px-4">
                    3D preview will appear here after generation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          {/* Primary CTA - Turn into Keychain */}
          <Button
            size="lg"
            disabled={!isSucceeded || !task.model_glb_url}
            onClick={() => navigate(`/studio?taskId=${task.id}`)}
            className="px-8"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Turn into Keychain
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/create")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Create New Model
          </Button>
        </div>
      </div>
    </div>
  );
}
