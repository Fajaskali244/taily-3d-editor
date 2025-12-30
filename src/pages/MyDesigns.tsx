import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import ModelViewer from "@/components/ModelViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import Navigation from "@/components/Navigation";

type Design = {
  id: string;
  name: string;
  chosen_glb_url: string | null;
  created_at: string;
};

export default function MyDesigns() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getDesigns();
  }, []);

  async function getDesigns() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("designs")
      .select("id, name, chosen_glb_url, created_at")
      .eq("user_id", user.id)
      .not("chosen_glb_url", "is", null)
      .order("created_at", { ascending: false });

    if (data) setDesigns(data);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-6xl mx-auto p-6 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
          <h1 className="text-3xl font-bold">My Design Collection</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((design) => (
            <Card key={design.id} className="overflow-hidden">
              <CardContent className="p-0">
                {design.chosen_glb_url ? (
                  <div className="h-64">
                    <ModelViewer glbUrl={design.chosen_glb_url} />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center bg-muted">
                    <span className="text-muted-foreground">No Model</span>
                  </div>
                )}
              </CardContent>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold">{design.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(design.created_at).toLocaleDateString()}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(design.chosen_glb_url!, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" /> Download GLB
                </Button>
              </div>
            </Card>
          ))}

          {designs.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No designs saved yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
