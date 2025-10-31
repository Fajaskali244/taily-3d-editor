import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

type DesignRow = { 
  id: string; 
  name: string;
  chosen_glb_url: string | null; 
  chosen_thumbnail_url: string | null;
};

function Model({ url }: { url: string }) {
  const gltf = useGLTF(url, true);
  return <primitive object={gltf.scene} />;
}

export default function DesignView() {
  const { id } = useParams();
  const [row, setRow] = useState<DesignRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("designs")
        .select("id, name, chosen_glb_url, chosen_thumbnail_url")
        .eq("id", id)
        .single();
      if (!active) return;
      if (error) console.error("load design", error);
      setRow(data ?? null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="container mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold">Design not found</h2>
        <Link to="/my-designs">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Designs
          </Button>
        </Link>
      </div>
    );
  }

  if (!row.chosen_glb_url) {
    return (
      <div className="container mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold">Model not ready</h2>
        <p className="text-muted-foreground">This model is still generating</p>
        <Link to="/my-designs">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Designs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/my-designs">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{row.name || "Untitled"}</h1>
        <div className="w-20"></div>
      </div>
      <div className="rounded-xl overflow-hidden border bg-background" style={{ height: "70vh" }}>
        <Canvas camera={{ position: [0, 0.8, 2.2], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <Environment preset="studio" />
          <OrbitControls enableDamping />
          <Model url={row.chosen_glb_url} />
        </Canvas>
      </div>
    </div>
  );
}
