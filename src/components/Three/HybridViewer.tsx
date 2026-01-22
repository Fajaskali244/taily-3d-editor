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

// Carabiner dimensions (in 3D units, roughly matching cm)
const CARABINER_WIDTH = 1.5
const CARABINER_HEIGHT = 3.0
const CHARM_MAX_SIZE = 3.0
const CHARM_INITIAL_Y = -2.0

// Default transform - positions the charm below the carabiner
const DEFAULT_TRANSFORM: AssetTransform = {
  position: [0, CHARM_INITIAL_Y, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1]
}

// Chrome/Metal material properties
const CHROME_MATERIAL = {
  color: '#E8E8E8',
  metalness: 0.95,
  roughness: 0.05
}

// The static Carabiner Ring base (1.5cm width x 3.0cm height)
function CarabinerRing() {
  const halfWidth = CARABINER_WIDTH / 2
  const halfHeight = CARABINER_HEIGHT / 2
  const tubeRadius = 0.08
  
  return (
    <group position={[0, 1.5, 0]}>
      {/* Main carabiner body - capsule/pill shape approximation */}
      {/* Left vertical bar */}
      <mesh position={[-halfWidth + tubeRadius, 0, 0]}>
        <capsuleGeometry args={[tubeRadius, halfHeight * 2 - tubeRadius * 4, 8, 16]} />
        <meshStandardMaterial {...CHROME_MATERIAL} />
      </mesh>
      
      {/* Right vertical bar */}
      <mesh position={[halfWidth - tubeRadius, 0, 0]}>
        <capsuleGeometry args={[tubeRadius, halfHeight * 2 - tubeRadius * 4, 8, 16]} />
        <meshStandardMaterial {...CHROME_MATERIAL} />
      </mesh>
      
      {/* Top curved connector */}
      <mesh position={[0, halfHeight - tubeRadius * 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[halfWidth - tubeRadius, tubeRadius, 12, 24, Math.PI]} />
        <meshStandardMaterial {...CHROME_MATERIAL} />
      </mesh>
      
      {/* Bottom curved connector */}
      <mesh position={[0, -halfHeight + tubeRadius * 2, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
        <torusGeometry args={[halfWidth - tubeRadius, tubeRadius, 12, 24, Math.PI]} />
        <meshStandardMaterial {...CHROME_MATERIAL} />
      </mesh>
      
      {/* Gate mechanism (the spring-loaded part) */}
      <mesh position={[halfWidth - tubeRadius * 2, halfHeight * 0.3, 0]}>
        <boxGeometry args={[tubeRadius * 1.5, halfHeight * 0.8, tubeRadius * 2]} />
        <meshStandardMaterial {...CHROME_MATERIAL} roughness={0.1} />
      </mesh>
      
      {/* Bottom attachment loop for charm */}
      <mesh position={[0, -halfHeight - 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.03, 12, 24]} />
        <meshStandardMaterial {...CHROME_MATERIAL} />
      </mesh>
      
      {/* Small connector ring */}
      <mesh position={[0, -halfHeight - 0.35, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial {...CHROME_MATERIAL} />
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

// Calculate auto-normalization scale to fit within max bounding box
function calculateAutoScale(scene: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3()
  box.getSize(size)
  
  const maxDimension = Math.max(size.x, size.y, size.z)
  if (maxDimension === 0) return 1
  
  // Scale to fit within CHARM_MAX_SIZE
  return CHARM_MAX_SIZE / maxDimension
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
  const [isInitialized, setIsInitialized] = useState(false)

  // Auto-normalize on first load
  useEffect(() => {
    if (meshRef.current && gltf.scene && !isInitialized) {
      // Calculate auto-scale to fit within max size
      const autoScale = calculateAutoScale(gltf.scene)
      
      // Apply auto-normalized transform
      meshRef.current.position.set(0, CHARM_INITIAL_Y, 0)
      meshRef.current.rotation.set(0, 0, 0)
      meshRef.current.scale.set(autoScale, autoScale, autoScale)
      
      // Update parent state with normalized values
      const normalizedTransform: AssetTransform = {
        position: [0, CHARM_INITIAL_Y, 0],
        rotation: [0, 0, 0],
        scale: [autoScale, autoScale, autoScale]
      }
      onTransformChange(normalizedTransform)
      setIsInitialized(true)
    }
  }, [gltf.scene, isInitialized, onTransformChange])

  // Apply transform changes from parent (e.g., inspector inputs)
  useEffect(() => {
    if (meshRef.current && isInitialized) {
      meshRef.current.position.set(...transform.position)
      meshRef.current.rotation.set(...transform.rotation)
      meshRef.current.scale.set(...transform.scale)
    }
  }, [transform, isInitialized])

  // Handle transform changes from gizmo controls
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
          size={1.0}
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
        {/* Static carabiner base */}
        <CarabinerRing />
        
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

      {/* 3D Canvas - camera positioned to see both 3cm carabiner and charm */}
      <Canvas 
        camera={{ position: [0, 0, 8], fov: 45 }}
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
