import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF } from '@react-three/drei'

function Model({ url }: { url: string }) {
  const gltf = useGLTF(url, true)
  return <primitive object={gltf.scene} />
}

interface ModelViewerProps {
  glbUrl: string
  className?: string
}

export default function ModelViewer({ glbUrl, className }: ModelViewerProps) {
  return (
    <div className={`aspect-square overflow-hidden bg-muted/20 rounded-2xl ${className ?? ''}`}>
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
