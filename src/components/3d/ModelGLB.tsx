import { Suspense } from 'react'
import { useGLTF } from '@react-three/drei'

interface ModelGLBProps {
  url: string
  position?: [number, number, number]
  scale?: number | [number, number, number]
  rotation?: [number, number, number]
}

const GLBContent = ({ url, scale = 1, rotation }: Omit<ModelGLBProps, 'position'>) => {
  const { scene } = useGLTF(url)
  return <primitive object={scene} scale={scale} rotation={rotation} />
}

export const ModelGLB = ({ url, position = [0, 0, 0], scale = 1, rotation }: ModelGLBProps) => {
  return (
    <group position={position}>
      <Suspense fallback={null}>
        <GLBContent url={url} scale={scale} rotation={rotation} />
      </Suspense>
    </group>
  )
}
