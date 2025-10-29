import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF } from '@react-three/drei'

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url, true)
  return <primitive object={scene} />
}

export default function MeshyModelPreview({ glbUrl }: { glbUrl?: string }) {
  if (!glbUrl) {
    return (
      <div className="border rounded-2xl aspect-square grid place-items-center bg-muted/20">
        <p className="text-muted-foreground">3D preview will appear here after generation</p>
      </div>
    )
  }

  return (
    <div className="border rounded-2xl aspect-square overflow-hidden bg-background">
      <Canvas camera={{ position: [0.6, 0.6, 0.9], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <Suspense fallback={null}>
          <Model url={glbUrl} />
        </Suspense>
        <Environment preset="city" />
        <OrbitControls enableDamping />
      </Canvas>
    </div>
  )
}
