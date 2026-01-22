import { Suspense, useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
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
import { AlertTriangle, Loader2, Move, RotateCw, Scaling, RotateCcw } from 'lucide-react'
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

export interface HybridViewerHandle {
  resetCamera: () => void
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
const HybridScene = forwardRef<
  { resetCamera: () => void },
  {
    modelUrl: string
    transform: AssetTransform
    onTransformChange: (transform: AssetTransform) => void
    transformMode: 'translate' | 'rotate' | 'scale'
  }
>(({ modelUrl, transform, onTransformChange, transformMode }, ref) => {
  const controlsRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (controlsRef.current) {
        controlsRef.current.reset()
      }
    }
  }))

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
        ref={controlsRef}
        makeDefault
        enablePan={true}
        enableZoom={true}
        minDistance={1}
        maxDistance={10}
      />
    </>
  )
})

HybridScene.displayName = 'HybridScene'

// Floating toolbar component
function FloatingToolbar({ 
  transformMode, 
  onModeChange 
}: { 
  transformMode: 'translate' | 'rotate' | 'scale'
  onModeChange: (mode: 'translate' | 'rotate' | 'scale') => void 
}) {
  const modes = [
    { mode: 'translate' as const, icon: Move, label: 'Move' },
    { mode: 'rotate' as const, icon: RotateCw, label: 'Rotate' },
    { mode: 'scale' as const, icon: Scaling, label: 'Scale' }
  ]

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden">
        {modes.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              transformMode === mode 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted text-foreground'
            }`}
            title={label}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Main exported component
const HybridViewer = forwardRef<HybridViewerHandle, HybridViewerProps>(({ 
  modelUrl, 
  initialTransform,
  onTransformChange,
  className 
}, ref) => {
  const [transform, setTransform] = useState<AssetTransform>(
    initialTransform ?? DEFAULT_TRANSFORM
  )
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const sceneRef = useRef<{ resetCamera: () => void }>(null)

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      sceneRef.current?.resetCamera()
    }
  }))

  const handleTransformChange = useCallback((newTransform: AssetTransform) => {
    setTransform(newTransform)
    onTransformChange?.(newTransform)
  }, [onTransformChange])

  const handleResetCamera = () => {
    sceneRef.current?.resetCamera()
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      {/* Floating toolbar */}
      <FloatingToolbar 
        transformMode={transformMode} 
        onModeChange={setTransformMode} 
      />

      {/* Reset camera button */}
      <button
        onClick={handleResetCamera}
        className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border text-sm font-medium hover:bg-muted transition-colors"
        title="Reset Camera"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Reset View</span>
      </button>

      {/* 3D Canvas */}
      <Canvas 
        camera={{ position: [2, 2, 4], fov: 45 }}
        className="bg-muted/20 rounded-xl"
      >
        <HybridScene 
          ref={sceneRef}
          modelUrl={modelUrl}
          transform={transform}
          onTransformChange={handleTransformChange}
          transformMode={transformMode}
        />
      </Canvas>
    </div>
  )
})

HybridViewer.displayName = 'HybridViewer'

export default HybridViewer

// Export the transform type for use in other components
export type { HybridViewerProps }
