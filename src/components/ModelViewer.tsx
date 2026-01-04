import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF } from '@react-three/drei'
import { ErrorBoundary } from './ErrorBoundary'
import { AlertTriangle } from 'lucide-react'

function Model({ url }: { url: string }) {
  const gltf = useGLTF(url, true)
  return <primitive object={gltf.scene} />
}

function ModelError() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
      <AlertTriangle className="w-8 h-8" />
      <p className="text-sm">Failed to load 3D model</p>
    </div>
  )
}

interface ModelViewerProps {
  glbUrl: string
  className?: string
}

export default function ModelViewer({ glbUrl, className }: ModelViewerProps) {
  return (
    <div className={`aspect-square overflow-hidden bg-muted/20 rounded-2xl ${className ?? ''}`}>
      <ErrorBoundary fallback={<ModelError />}>
        <Canvas camera={{ position: [0.6, 0.6, 0.9], fov: 50 }}>
          <ambientLight intensity={0.8} />
          <Suspense fallback={null}>
            <Model url={glbUrl} />
          </Suspense>
          <Environment preset="city" />
          <OrbitControls enableDamping />
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}
