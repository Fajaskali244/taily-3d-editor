import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const RefreshModelButton = ({ taskId, onRefresh }: { taskId: string, onRefresh: () => void }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Trigger the edge function to re-mirror this task
      const { data, error } = await supabase.functions.invoke('hunyuan3d', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 're-mirror', id: taskId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Model URL has been updated.",
      });
      
      onRefresh(); // Refresh the parent data
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to refresh model. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleRefresh} 
      disabled={isRefreshing}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? "Fixing URL..." : "Fix Broken Link"}
    </Button>
  );
};
