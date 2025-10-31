import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";

type DesignRow = {
  id: string;
  chosen_glb_url: string | null;
  chosen_thumbnail_url: string | null;
  generation_task_id: string | null;
  name: string;
  created_at: string;
};

export default function MyDesigns() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DesignRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { 
        setRows([]); 
        setLoading(false); 
        return; 
      }

      const { data, error } = await supabase
        .from("designs")
        .select("id, name, chosen_glb_url, chosen_thumbnail_url, generation_task_id, created_at")
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        console.error("load designs", error);
        setRows([]);
      } else {
        setRows(data ?? []);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh] pt-24">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }
  
  if (rows.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6 pt-24 text-center space-y-6">
          <h1 className="text-3xl font-bold">My Designs</h1>
          <p className="text-muted-foreground">No designs yet</p>
          <Button onClick={() => navigate("/create")}>Create your first 3D model</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-6xl mx-auto p-6 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Designs</h1>
          <p className="text-muted-foreground mt-2">View your generated 3D models</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {rows.map(r => (
            <DesignCard key={r.id} row={r} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DesignCard({ row }: { row: DesignRow }) {
  const hasModel = !!row.chosen_glb_url;
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square bg-muted flex items-center justify-center">
        {row.chosen_thumbnail_url ? (
          <img src={row.chosen_thumbnail_url} alt="thumbnail" className="w-full h-full object-cover" />
        ) : (
          <div className="text-sm text-muted-foreground">No thumbnail</div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold truncate">{row.name || "Untitled"}</h3>
          <p className="text-sm text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          {hasModel ? (
            <Link to={`/design/${row.id}`} className="flex-1">
              <Button className="w-full">View 3D Model</Button>
            </Link>
          ) : (
            <Link to={`/review/${row.generation_task_id ?? ""}`} className="flex-1">
              <Button variant="outline" className="w-full">Generating…</Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
