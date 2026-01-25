import { Suspense, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Canvas } from '@react-three/fiber'
import { 
  OrbitControls, 
  Environment, 
  Center, 
  Resize,
  Gltf,
  Html
} from '@react-three/drei'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AlertTriangle, Loader2, RotateCcw, ArrowUpDown } from 'lucide-react'
import { Slider } from '@/components/ui/slider'

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

// Scene dimensions
const CHARM_TARGET_HEIGHT = 2.5
const RING_POSITION: [number, number, number] = [0, 1.2, 0]

// Default transform
const DEFAULT_TRANSFORM: AssetTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1]
}

// Procedural carabiner fallback
function CarabinerRingFallback() {
  const tubeRadius = 0.08
  
  return (
    <group>
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

// Loading state
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

// Error state
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

// Main component
const HybridViewer = forwardRef<HybridViewerHandle, HybridViewerProps>(({ 
  modelUrl, 
  baseModelUrl,
  initialTransform,
  onTransformChange,
  className 
}, ref) => {
  const [verticalOffset, setVerticalOffset] = useState(initialTransform?.position[1] ?? 0)
  const controlsRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    resetCamera: () => controlsRef.current?.reset(),
    triggerAutoFit: () => {
      setVerticalOffset(0)
      const newTransform: AssetTransform = {
        ...DEFAULT_TRANSFORM,
        position: [0, 0, 0]
      }
      onTransformChange?.(newTransform)
    }
  }))

  const handleVerticalChange = useCallback((value: number) => {
    setVerticalOffset(value)
    const newTransform: AssetTransform = {
      position: [0, value, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    }
    onTransformChange?.(newTransform)
  }, [onTransformChange])

  const handleReset = useCallback(() => {
    setVerticalOffset(0)
    controlsRef.current?.reset()
    onTransformChange?.(DEFAULT_TRANSFORM)
  }, [onTransformChange])

  return (
    <div className={`relative ${className ?? ''}`}>
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2.5 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border">
        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground whitespace-nowrap">Height</span>
        <Slider
          value={[verticalOffset]}
          onValueChange={([value]) => handleVerticalChange(value)}
          min={-2.5}
          max={1.0}
          step={0.05}
          className="w-40"
        />
        <span className="text-xs text-muted-foreground w-12 text-right">
          {verticalOffset.toFixed(2)}
        </span>
      </div>

      {/* Reset Camera Button */}
      <button
        onClick={handleReset}
        className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border text-sm font-medium hover:bg-muted transition-colors"
        title="Reset"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Reset</span>
      </button>

      {/* 3D Canvas */}
      <Canvas 
        camera={{ position: [0, 0, 8], fov: 45 }}
        className="bg-muted/20 rounded-xl"
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-5, -5, 5]} intensity={0.3} />
        
        {/* Static Ring */}
        <group position={RING_POSITION}>
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
        </group>
        
        {/* Dynamic Charm with Vertical Offset */}
        {modelUrl && (
          <Suspense fallback={<ModelLoading />}>
            <ErrorBoundary fallback={<ModelError />}>
              <group position={[0, verticalOffset, 0]}>
                <Center top>
                  <Resize height scale={CHARM_TARGET_HEIGHT}>
                    <Gltf src={modelUrl} />
                  </Resize>
                </Center>
              </group>
            </ErrorBoundary>
          </Suspense>
        )}
        
        <Environment preset="studio" />
        <OrbitControls 
          ref={controlsRef}
          makeDefault
          enablePan={true}
          enableZoom={true}
          minDistance={1}
          maxDistance={15}
        />
      </Canvas>
    </div>
  )
})

HybridViewer.displayName = 'HybridViewer'

export default HybridViewer
export type { HybridViewerProps }
