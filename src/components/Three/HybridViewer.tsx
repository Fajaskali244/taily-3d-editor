import { Suspense, useRef, useState, useLayoutEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
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
import { AlertTriangle, Loader2, Move, RotateCw, Scaling, RotateCcw, Maximize2 } from 'lucide-react'
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
  manualScale?: number
  onAutoFit?: () => void
  className?: string
}

export interface HybridViewerHandle {
  resetCamera: () => void
  triggerAutoFit: () => void
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

/**
 * Fit Model Function - Properly measures, centers, and scales the model
 * This runs AFTER the model is fully loaded and rendered
 */
function fitModel(scene: THREE.Object3D): { scale: number; centerOffset: THREE.Vector3 } {
  // Step A: Measure - Get true world bounds
  const box = new THREE.Box3().setFromObject(scene)
  
  // Step B: Center - Calculate the center of the bounding box
  const center = new THREE.Vector3()
  box.getCenter(center)
  const centerOffset = center.clone().negate()
  
  // Step C: Scale - Get size and find largest dimension
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  
  // Step D: Apply - Calculate scale factor (target 3.0 units)
  const scaleFactor = maxDim > 0 ? CHARM_MAX_SIZE / maxDim : 1
  
  console.log('[fitModel] Measured:', { 
    size: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
    maxDim: maxDim.toFixed(2),
    scaleFactor: scaleFactor.toFixed(3),
    center: { x: center.x.toFixed(2), y: center.y.toFixed(2), z: center.z.toFixed(2) }
  })
  
  return { scale: scaleFactor, centerOffset }
}

// The AI-generated model with transform controls
function AIModel({ 
  url, 
  transform,
  onTransformChange,
  transformMode,
  manualScaleMultiplier,
  onFitComplete,
  triggerFit
}: { 
  url: string
  transform: AssetTransform
  onTransformChange: (transform: AssetTransform) => void
  transformMode: 'translate' | 'rotate' | 'scale'
  manualScaleMultiplier: number
  onFitComplete: () => void
  triggerFit: number
}) {
  const gltf = useGLTF(url, true)
  const meshRef = useRef<THREE.Group>(null)
  const primitiveRef = useRef<THREE.Object3D>(null)
  const controlsRef = useRef<any>(null)
  const [baseScale, setBaseScale] = useState(1)
  const [isInitialized, setIsInitialized] = useState(false)
  const lastUrlRef = useRef(url)

  // Reset initialization when URL changes
  if (url !== lastUrlRef.current) {
    lastUrlRef.current = url
    setIsInitialized(false)
    setBaseScale(1)
  }

  // The core auto-fit function that can be called manually or automatically
  const performAutoFit = useCallback(() => {
    if (!meshRef.current || !gltf.scene) {
      console.log('[performAutoFit] No mesh or scene available')
      return
    }

    console.log('[performAutoFit] Starting fit...')
    
    // Clone scene to measure without affecting transforms
    const measureScene = gltf.scene.clone()
    measureScene.scale.set(1, 1, 1)
    measureScene.position.set(0, 0, 0)
    measureScene.updateMatrixWorld(true)
    
    const { scale, centerOffset } = fitModel(measureScene)
    
    // Apply the calculated transform
    setBaseScale(scale)
    
    // Position at hanging point with center offset applied
    const finalX = centerOffset.x * scale
    const finalY = CHARM_INITIAL_Y + (centerOffset.y * scale)
    const finalZ = centerOffset.z * scale
    
    meshRef.current.position.set(finalX, finalY, finalZ)
    meshRef.current.rotation.set(0, 0, 0)
    meshRef.current.scale.set(scale, scale, scale)
    
    const newTransform: AssetTransform = {
      position: [finalX, finalY, finalZ],
      rotation: [0, 0, 0],
      scale: [scale, scale, scale]
    }
    
    onTransformChange(newTransform)
    setIsInitialized(true)
    onFitComplete()
    
    console.log('[performAutoFit] Applied transform:', newTransform)
  }, [gltf.scene, onTransformChange, onFitComplete])

  // Auto-fit on initial load with delay to ensure render is complete
  useLayoutEffect(() => {
    if (gltf.scene && !isInitialized) {
      console.log('[useLayoutEffect] Scheduling auto-fit in 100ms...')
      const timer = setTimeout(() => {
        performAutoFit()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [gltf.scene, isInitialized, performAutoFit])

  // Manual trigger for auto-fit (from button)
  useLayoutEffect(() => {
    if (triggerFit > 0 && gltf.scene) {
      console.log('[useLayoutEffect] Manual fit triggered')
      const timer = setTimeout(() => {
        performAutoFit()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [triggerFit, gltf.scene, performAutoFit])

  // Apply manual scale multiplier on top of base scale
  useLayoutEffect(() => {
    if (meshRef.current && isInitialized && manualScaleMultiplier !== 1) {
      const newScale = baseScale * manualScaleMultiplier
      meshRef.current.scale.set(newScale, newScale, newScale)
      
      const newTransform: AssetTransform = {
        position: transform.position,
        rotation: transform.rotation,
        scale: [newScale, newScale, newScale]
      }
      onTransformChange(newTransform)
    }
  }, [manualScaleMultiplier, baseScale, isInitialized, transform.position, transform.rotation, onTransformChange])

  // Apply transform changes from parent (e.g., inspector inputs)
  useLayoutEffect(() => {
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
      // Update base scale when user manually scales
      setBaseScale(meshRef.current.scale.x)
    }
  }, [onTransformChange])

  return (
    <>
      <group ref={meshRef}>
        <primitive ref={primitiveRef} object={gltf.scene.clone()} />
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
  { resetCamera: () => void; triggerAutoFit: () => void },
  {
    modelUrl: string
    transform: AssetTransform
    onTransformChange: (transform: AssetTransform) => void
    transformMode: 'translate' | 'rotate' | 'scale'
    manualScaleMultiplier: number
  }
>(({ modelUrl, transform, onTransformChange, transformMode, manualScaleMultiplier }, ref) => {
  const controlsRef = useRef<any>(null)
  const [fitTrigger, setFitTrigger] = useState(0)

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (controlsRef.current) {
        controlsRef.current.reset()
      }
    },
    triggerAutoFit: () => {
      setFitTrigger(prev => prev + 1)
    }
  }))

  const handleFitComplete = useCallback(() => {
    console.log('[HybridScene] Fit complete')
  }, [])

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
              manualScaleMultiplier={manualScaleMultiplier}
              onFitComplete={handleFitComplete}
              triggerFit={fitTrigger}
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
        maxDistance={15}
      />
    </>
  )
})

HybridScene.displayName = 'HybridScene'

// Floating toolbar component with Auto-Fit button
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
      
      {/* Auto-Fit Button */}
      <button
        onClick={onAutoFit}
        className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground backdrop-blur-sm rounded-lg shadow-lg border text-sm font-medium hover:bg-secondary/80 transition-colors"
        title="Auto-Fit Model"
      >
        <Maximize2 className="w-4 h-4" />
        <span className="hidden sm:inline">Auto-Fit</span>
      </button>
    </div>
  )
}

// Main exported component
const HybridViewer = forwardRef<HybridViewerHandle, HybridViewerProps>(({ 
  modelUrl, 
  initialTransform,
  onTransformChange,
  manualScale = 1,
  className 
}, ref) => {
  const [transform, setTransform] = useState<AssetTransform>(
    initialTransform ?? DEFAULT_TRANSFORM
  )
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const sceneRef = useRef<{ resetCamera: () => void; triggerAutoFit: () => void }>(null)

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      sceneRef.current?.resetCamera()
    },
    triggerAutoFit: () => {
      sceneRef.current?.triggerAutoFit()
    }
  }))

  const handleTransformChange = useCallback((newTransform: AssetTransform) => {
    setTransform(newTransform)
    onTransformChange?.(newTransform)
  }, [onTransformChange])

  const handleResetCamera = () => {
    sceneRef.current?.resetCamera()
  }

  const handleAutoFit = () => {
    sceneRef.current?.triggerAutoFit()
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      {/* Floating toolbar with Auto-Fit button */}
      <FloatingToolbar 
        transformMode={transformMode} 
        onModeChange={setTransformMode}
        onAutoFit={handleAutoFit}
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
          manualScaleMultiplier={manualScale}
        />
      </Canvas>
    </div>
  )
})

HybridViewer.displayName = 'HybridViewer'

export default HybridViewer

// Export the transform type for use in other components
export type { HybridViewerProps }
