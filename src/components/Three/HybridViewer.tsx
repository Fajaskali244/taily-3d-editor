import { Suspense, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Canvas } from '@react-three/fiber'
import { 
  OrbitControls, 
  Environment, 
  Center, 
  Resize,
  Gltf,
  TransformControls,
  Html,
  useGLTF
} from '@react-three/drei'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AlertTriangle, Loader2, Move, RotateCw, Scaling, RotateCcw, Maximize2 } from 'lucide-react'
import type { Group } from 'three'

// Types for asset transform
export interface AssetTransform {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

interface HybridViewerProps {
  modelUrl: string
  baseModelUrl?: string
  initialTransform?: AssetTransform
  onTransformChange?: (transform: AssetTransform) => void
  className?: string
}

export interface HybridViewerHandle {
  resetCamera: () => void
  triggerAutoFit: () => void
}

/**
 * Default carabiner model URL
 * Replace with your Supabase Storage URL once uploaded
 */
const DEFAULT_CARABINER_URL = ''

// Scene dimensions
const CHARM_TARGET_HEIGHT = 2.5
const CHARM_HANG_POSITION: [number, number, number] = [0, -2.0, 0]

// Default transform
const DEFAULT_TRANSFORM: AssetTransform = {
  position: CHARM_HANG_POSITION,
  rotation: [0, 0, 0],
  scale: [1, 1, 1]
}

// Procedural carabiner fallback
function CarabinerRingFallback() {
  const tubeRadius = 0.08
  
  return (
    <group position={[0, 1.5, 0]}>
      {/* Left vertical bar */}
      <mesh position={[-0.67, 0, 0]}>
        <capsuleGeometry args={[tubeRadius, 2.5, 8, 16]} />
        <meshStandardMaterial color="#E8E8E8" metalness={0.95} roughness={0.05} />
      </mesh>
      
      {/* Right vertical bar */}
      <mesh position={[0.67, 0, 0]}>
        <capsuleGeometry args={[tubeRadius, 2.5, 8, 16]} />
        <meshStandardMaterial color="#E8E8E8" metalness={0.95} roughness={0.05} />
      </mesh>
      
      {/* Top curved connector */}
      <mesh position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.59, tubeRadius, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#E8E8E8" metalness={0.95} roughness={0.05} />
      </mesh>
      
      {/* Bottom curved connector */}
      <mesh position={[0, -1.35, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
        <torusGeometry args={[0.59, tubeRadius, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#E8E8E8" metalness={0.95} roughness={0.05} />
      </mesh>
      
      {/* Gate mechanism */}
      <mesh position={[0.55, 0.4, 0]}>
        <boxGeometry args={[0.12, 1.0, 0.16]} />
        <meshStandardMaterial color="#E8E8E8" metalness={0.95} roughness={0.1} />
      </mesh>
      
      {/* Bottom attachment loop */}
      <mesh position={[0, -1.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.03, 12, 24]} />
        <meshStandardMaterial color="#E8E8E8" metalness={0.95} roughness={0.05} />
      </mesh>
    </group>
  )
}

// Loading states
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

// The movable AI charm with TransformControls
function AICharm({ 
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
  const groupRef = useRef<Group>(null)
  const controlsRef = useRef<any>(null)

  // Handle transform changes from gizmo
  const handleChange = useCallback(() => {
    if (groupRef.current) {
      const newTransform: AssetTransform = {
        position: [
          groupRef.current.position.x,
          groupRef.current.position.y,
          groupRef.current.position.z
        ],
        rotation: [
          groupRef.current.rotation.x,
          groupRef.current.rotation.y,
          groupRef.current.rotation.z
        ],
        scale: [
          groupRef.current.scale.x,
          groupRef.current.scale.y,
          groupRef.current.scale.z
        ]
      }
      onTransformChange(newTransform)
    }
  }, [onTransformChange])

  return (
    <>
      <group 
        ref={groupRef}
        position={transform.position}
        rotation={transform.rotation}
        scale={transform.scale}
      >
        {/* Center horizontally, align to top for hanging */}
        <Center top>
          {/* Resize to fit in a 2.5 unit box, scaled uniformly */}
          <Resize height scale={CHARM_TARGET_HEIGHT}>
            <Gltf src={url} />
          </Resize>
        </Center>
      </group>
      
      {groupRef.current && (
        <TransformControls
          ref={controlsRef}
          object={groupRef.current}
          mode={transformMode}
          onObjectChange={handleChange}
          size={1.0}
        />
      )}
    </>
  )
}

// Scene content
const HybridScene = forwardRef<
  { resetCamera: () => void; triggerAutoFit: () => void },
  {
    modelUrl: string
    baseModelUrl: string
    transform: AssetTransform
    onTransformChange: (transform: AssetTransform) => void
    transformMode: 'translate' | 'rotate' | 'scale'
  }
>(({ modelUrl, baseModelUrl, transform, onTransformChange, transformMode }, ref) => {
  const controlsRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      controlsRef.current?.reset()
    },
    triggerAutoFit: () => {
      // Reset to default hanging position
      onTransformChange(DEFAULT_TRANSFORM)
    }
  }))

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-5, -5, 5]} intensity={0.3} />
      
      {/* Static Ring Base */}
      <Center disableY>
        {baseModelUrl ? (
          <Suspense fallback={<ModelLoading />}>
            <ErrorBoundary fallback={<CarabinerRingFallback />}>
              <Resize height scale={3.0}>
                <Gltf src={baseModelUrl} />
              </Resize>
            </ErrorBoundary>
          </Suspense>
        ) : (
          <CarabinerRingFallback />
        )}
      </Center>
      
      {/* Movable AI Charm */}
      <Suspense fallback={<ModelLoading />}>
        <ErrorBoundary fallback={<ModelError />}>
          <AICharm 
            url={modelUrl} 
            transform={transform}
            onTransformChange={onTransformChange}
            transformMode={transformMode}
          />
        </ErrorBoundary>
      </Suspense>
      
      <Environment preset="studio" />
      <OrbitControls 
        ref={controlsRef}
        makeDefault
        enablePan={true}
        enableZoom={true}
        minDistance={1}
        maxDistance={15}
      />
    </>
  )
})

HybridScene.displayName = 'HybridScene'

// Floating toolbar
function FloatingToolbar({ 
  transformMode, 
  onModeChange,
  onAutoFit
}: { 
  transformMode: 'translate' | 'rotate' | 'scale'
  onModeChange: (mode: 'translate' | 'rotate' | 'scale') => void
  onAutoFit: () => void
}) {
  const modes = [
    { mode: 'translate' as const, icon: Move, label: 'Move' },
    { mode: 'rotate' as const, icon: RotateCw, label: 'Rotate' },
    { mode: 'scale' as const, icon: Scaling, label: 'Scale' }
  ]

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
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
      
      <button
        onClick={onAutoFit}
        className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground backdrop-blur-sm rounded-lg shadow-lg border text-sm font-medium hover:bg-secondary/80 transition-colors"
        title="Reset Position"
      >
        <Maximize2 className="w-4 h-4" />
        <span className="hidden sm:inline">Reset</span>
      </button>
    </div>
  )
}

// Canvas loading skeleton
function CanvasLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Initializing 3D viewer...</span>
      </div>
    </div>
  )
}

// Main component
const HybridViewer = forwardRef<HybridViewerHandle, HybridViewerProps>(({ 
  modelUrl, 
  baseModelUrl = DEFAULT_CARABINER_URL,
  initialTransform,
  onTransformChange,
  className 
}, ref) => {
  const [transform, setTransform] = useState<AssetTransform>(
    initialTransform ?? DEFAULT_TRANSFORM
  )
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const [isCanvasReady, setIsCanvasReady] = useState(false)
  const sceneRef = useRef<{ resetCamera: () => void; triggerAutoFit: () => void }>(null)

  useImperativeHandle(ref, () => ({
    resetCamera: () => sceneRef.current?.resetCamera(),
    triggerAutoFit: () => sceneRef.current?.triggerAutoFit()
  }))

  const handleTransformChange = useCallback((newTransform: AssetTransform) => {
    setTransform(newTransform)
    onTransformChange?.(newTransform)
  }, [onTransformChange])

  return (
    <div className={`relative ${className ?? ''}`}>
      {!isCanvasReady && <CanvasLoading />}
      
      <FloatingToolbar 
        transformMode={transformMode} 
        onModeChange={setTransformMode}
        onAutoFit={() => sceneRef.current?.triggerAutoFit()}
      />

      <button
        onClick={() => sceneRef.current?.resetCamera()}
        className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border text-sm font-medium hover:bg-muted transition-colors"
        title="Reset Camera"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Reset View</span>
      </button>

      <Canvas 
        camera={{ position: [0, 0, 8], fov: 45 }}
        className="bg-muted/20 rounded-xl"
        onCreated={() => setIsCanvasReady(true)}
      >
        <HybridScene 
          ref={sceneRef}
          modelUrl={modelUrl}
          baseModelUrl={baseModelUrl}
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
export type { HybridViewerProps }
