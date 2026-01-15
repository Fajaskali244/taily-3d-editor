import { Suspense, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { 
  OrbitControls, 
  Environment, 
  Center, 
  useGLTF, 
  TransformControls,
  Html
} from '@react-three/drei'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AlertTriangle, Loader2 } from 'lucide-react'
import * as THREE from 'three'

// Types for asset transform
export interface AssetTransform {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

interface HybridViewerProps {
  modelUrl: string
  initialTransform?: AssetTransform
  onTransformChange?: (transform: AssetTransform) => void
  className?: string
}

// Default transform - positions the charm below the ring
const DEFAULT_TRANSFORM: AssetTransform = {
  position: [0, 0.3, 0],
  rotation: [0, 0, 0],
  scale: [0.5, 0.5, 0.5]
}

// The static Taily Ring base
function TailyRing() {
  return (
    <group>
      {/* Main keyring torus */}
      <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.08, 16, 48]} />
        <meshStandardMaterial 
          color="#C0C0C0" 
          metalness={0.85} 
          roughness={0.15} 
        />
      </mesh>
      
      {/* Connection loop at bottom of ring */}
      <mesh position={[0, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.15, 0.03, 12, 24]} />
        <meshStandardMaterial 
          color="#B8B8B8" 
          metalness={0.85} 
          roughness={0.15} 
        />
      </mesh>
      
      {/* Chain link connector */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.3, 12]} />
        <meshStandardMaterial 
          color="#C0C0C0" 
          metalness={0.85} 
          roughness={0.15} 
        />
      </mesh>
      
      {/* Bottom attachment point (where charm connects) */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial 
          color="#A0A0A0" 
          metalness={0.9} 
          roughness={0.1} 
        />
      </mesh>
    </group>
  )
}

// Loading placeholder for the AI model
function ModelLoading() {
  return (
    <Html center>
      <div className="flex items-center gap-2 bg-background/90 px-3 py-2 rounded-lg shadow-lg">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-foreground">Loading model...</span>
      </div>
    </Html>
  )
}

// The AI-generated model with transform controls
function AIModel({ 
  url, 
  transform,
  onTransformChange,
  transformMode
}: { 
  url: string
  transform: AssetTransform
  onTransformChange: (transform: AssetTransform) => void
  transformMode: 'translate' | 'rotate' | 'scale'
}) {
  const gltf = useGLTF(url, true)
  const meshRef = useRef<THREE.Group>(null)
  const controlsRef = useRef<any>(null)

  // Apply initial transform
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(...transform.position)
      meshRef.current.rotation.set(...transform.rotation)
      meshRef.current.scale.set(...transform.scale)
    }
  }, []) // Only run on mount

  // Handle transform changes from controls
  const handleChange = useCallback(() => {
    if (meshRef.current) {
      const newTransform: AssetTransform = {
        position: [
          meshRef.current.position.x,
          meshRef.current.position.y,
          meshRef.current.position.z
        ],
        rotation: [
          meshRef.current.rotation.x,
          meshRef.current.rotation.y,
          meshRef.current.rotation.z
        ],
        scale: [
          meshRef.current.scale.x,
          meshRef.current.scale.y,
          meshRef.current.scale.z
        ]
      }
      onTransformChange(newTransform)
    }
  }, [onTransformChange])

  return (
    <>
      <group ref={meshRef}>
        <primitive object={gltf.scene.clone()} />
      </group>
      
      {meshRef.current && (
        <TransformControls
          ref={controlsRef}
          object={meshRef.current}
          mode={transformMode}
          onObjectChange={handleChange}
          size={0.7}
        />
      )}
    </>
  )
}

// Error display for model loading failures
function ModelError() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 bg-destructive/10 px-4 py-3 rounded-lg">
        <AlertTriangle className="w-6 h-6 text-destructive" />
        <span className="text-sm text-destructive">Failed to load model</span>
      </div>
    </Html>
  )
}

// The inner scene content
function HybridScene({ 
  modelUrl, 
  transform, 
  onTransformChange,
  transformMode
}: {
  modelUrl: string
  transform: AssetTransform
  onTransformChange: (transform: AssetTransform) => void
  transformMode: 'translate' | 'rotate' | 'scale'
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-5, -5, 5]} intensity={0.3} />
      
      <Center disableY>
        {/* Static ring base */}
        <TailyRing />
        
        {/* AI model with transform controls */}
        <Suspense fallback={<ModelLoading />}>
          <ErrorBoundary fallback={<ModelError />}>
            <AIModel 
              url={modelUrl} 
              transform={transform}
              onTransformChange={onTransformChange}
              transformMode={transformMode}
            />
          </ErrorBoundary>
        </Suspense>
      </Center>
      
      <Environment preset="studio" />
      <OrbitControls 
        makeDefault
        enablePan={true}
        enableZoom={true}
        minDistance={1}
        maxDistance={10}
      />
    </>
  )
}

// Main exported component
export default function HybridViewer({ 
  modelUrl, 
  initialTransform,
  onTransformChange,
  className 
}: HybridViewerProps) {
  const [transform, setTransform] = useState<AssetTransform>(
    initialTransform ?? DEFAULT_TRANSFORM
  )
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate')

  const handleTransformChange = useCallback((newTransform: AssetTransform) => {
    setTransform(newTransform)
    onTransformChange?.(newTransform)
  }, [onTransformChange])

  return (
    <div className={`relative ${className ?? ''}`}>
      {/* Transform mode controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setTransformMode('translate')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            transformMode === 'translate' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-background/80 hover:bg-background text-foreground border'
          }`}
        >
          Move
        </button>
        <button
          onClick={() => setTransformMode('rotate')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            transformMode === 'rotate' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-background/80 hover:bg-background text-foreground border'
          }`}
        >
          Rotate
        </button>
        <button
          onClick={() => setTransformMode('scale')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            transformMode === 'scale' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-background/80 hover:bg-background text-foreground border'
          }`}
        >
          Scale
        </button>
      </div>

      {/* Transform values display */}
      <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-mono space-y-1 border">
        <div className="text-muted-foreground">
          <span className="text-foreground font-semibold">Pos:</span>{' '}
          {transform.position.map(v => v.toFixed(2)).join(', ')}
        </div>
        <div className="text-muted-foreground">
          <span className="text-foreground font-semibold">Rot:</span>{' '}
          {transform.rotation.map(v => (v * 180 / Math.PI).toFixed(1)).join('°, ')}°
        </div>
        <div className="text-muted-foreground">
          <span className="text-foreground font-semibold">Scale:</span>{' '}
          {transform.scale.map(v => v.toFixed(2)).join(', ')}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs max-w-48 border">
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Tip:</span> Use the gizmo to position the charm. Drag to orbit the camera.
        </p>
      </div>

      {/* 3D Canvas */}
      <Canvas 
        camera={{ position: [2, 2, 4], fov: 45 }}
        className="bg-muted/20 rounded-xl"
      >
        <HybridScene 
          modelUrl={modelUrl}
          transform={transform}
          onTransformChange={handleTransformChange}
          transformMode={transformMode}
        />
      </Canvas>
    </div>
  )
}

// Export the transform type for use in other components
export type { HybridViewerProps }
