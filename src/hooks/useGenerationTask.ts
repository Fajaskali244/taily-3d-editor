import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchTask } from "@/lib/genTasks";

export function useGenerationTask(taskId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["genTask", taskId],
    queryFn: () => fetchTask(taskId!),
    enabled: !!taskId,
  });

  // Subscribe to Realtime updates
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel("gen_tasks")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generation_tasks",
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          console.log("Realtime update:", payload);
          queryClient.setQueryData(["genTask", taskId], (prev: any) => ({
            ...(prev ?? {}),
            ...(payload.new as any),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  const canApprove =
    !!query.data?.model_glb_url && query.data?.status === "SUCCEEDED";

  return {
    task: query.data,
    isLoading: query.isLoading,
    canApprove,
  };
}
