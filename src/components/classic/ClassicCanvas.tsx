import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { Card, CardContent } from '@/components/ui/card'
import { getSignedUrl } from '@/lib/storage'
import { fetchCatalogItems } from '@/lib/catalog'
import type { PlacedItem, CatalogItem } from '@/lib/catalog'
import { ModelGLB } from '@/components/3d/ModelGLB'
import {
  MM_PER_UNIT,
  mm2u,
  TOP_Y,
  STEM_CLEARANCE_MM,
  SPACING_MM,
  STEM_TAIL_MM,
  STEM_MIN_MM,
  STEM_MAX_MM,
  DEFAULT_BEAD_HEIGHT_MM,
  STEM_RADIUS,
  STEM_SEGMENTS,
  clamp
} from '@/components/3d/constants'

interface ClassicCanvasProps {
  state: {
    keyringId: string
    placed: PlacedItem[]
    params: { colorTheme?: string }
  }
  isDragging: boolean
  draggedItem: CatalogItem | null
  onDrop: (item: CatalogItem) => void
  onRemoveItem: (uid: string) => void
}

// Individual 3D components
const KeyringMesh = ({ keyringId, colorTheme }: { keyringId: string; colorTheme?: string }) => {
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null)
  
  useEffect(() => {
    const loadModel = async () => {
      const items = await fetchCatalogItems()
      const item = items.find(i => i.id === keyringId)
      if (item) {
        setCatalogItem(item)
        const url = await getSignedUrl(item.glbPath.replace('/models/', ''))
        setModelUrl(url)
      }
    }
    loadModel()
  }, [keyringId])

  const ringColor = colorTheme === 'gold' ? '#FFD700' : '#C0C0C0'

  // Fallback geometry if GLB not available
  const ringGeometry = (
    <group position={[0, TOP_Y, 0]}>
      {/* Main ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.1, 8, 16]} />
        <meshStandardMaterial 
          color={ringColor}
          metalness={0.8} 
          roughness={0.2} 
        />
      </mesh>
    </group>
  )

  // Try to load GLB, fallback to geometry
  if (modelUrl) {
    return (
      <>
        <ModelGLB url={modelUrl} position={[0, TOP_Y, 0]} />
      </>
    )
  }

  return ringGeometry
}

const PlacedItemMesh = ({ 
  item, 
  yPosition,
  onRemove 
}: { 
  item: PlacedItem; 
  yPosition: number;
  onRemove: (uid: string) => void 
}) => {
  const meshRef = useRef<THREE.Group>(null)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null)
  const [animationProgress, setAnimationProgress] = useState(0)
  
  useEffect(() => {
    const loadModel = async () => {
      const items = await fetchCatalogItems()
      const itemData = items.find(i => i.id === item.catalogId)
      if (itemData) {
        setCatalogItem(itemData)
        const url = await getSignedUrl(itemData.glbPath.replace('/models/', ''))
        setModelUrl(url)
      }
    }
    loadModel()
  }, [item.catalogId])

  // Animate descent
  useEffect(() => {
    const startTime = Date.now()
    const duration = 800 // ms
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth descent
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimationProgress(eased)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    animate()
  }, [])

  // Animate from above to final position
  const startY = TOP_Y + 1.5 // Start from above the ring
  const animatedY = startY + (yPosition - startY) * animationProgress


  // Fallback geometries
  const getFallbackGeometry = () => {
    if (!catalogItem) return null

    const scale = isHovered ? 1.1 : 1.0
    const color = item.color || (catalogItem.kind === 'bead' ? '#FF6B6B' : '#4ECDC4')

    if (catalogItem.kind === 'bead') {
      return (
        <mesh scale={scale}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color={color} metalness={0.1} roughness={0.6} />
        </mesh>
      )
    } else if (catalogItem.kind === 'charm') {
      return (
        <mesh scale={scale} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.2, 0.2, 0.05]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
        </mesh>
      )
    }
    
    return null
  }

  return (
    <group
      ref={meshRef}
      position={[0, animatedY, 0]}
      rotation={item.rotation}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        if (e.shiftKey) {
          onRemove(item.uid)
        }
      }}
    >
      {modelUrl ? (
        <ModelGLB url={modelUrl} scale={isHovered ? 1.1 : 1.0} />
      ) : (
        getFallbackGeometry()
      )}
    </group>
  )
}

const Scene = ({ state, onRemoveItem }: { 
  state: ClassicCanvasProps['state']; 
  onRemoveItem: (uid: string) => void 
}) => {
  const [catalogById, setCatalogById] = useState<Map<string, CatalogItem>>(new Map())
  
  // Load catalog items once
  useEffect(() => {
    const loadCatalog = async () => {
      const items = await fetchCatalogItems()
      const map = new Map(items.map(item => [item.id, item]))
      setCatalogById(map)
    }
    loadCatalog()
  }, [])

  // Calculate bead positions and stem length based on actual heights
  const beadLayout = useMemo(() => {
    const sortedItems = [...state.placed].sort((a, b) => a.positionIndex - b.positionIndex)
    
    let accMm = STEM_CLEARANCE_MM
    const positions: { item: PlacedItem; yWorld: number; heightMm: number }[] = []
    
    for (const item of sortedItems) {
      const catalogItem = catalogById.get(item.catalogId)
      const heightMm = catalogItem?.height ?? DEFAULT_BEAD_HEIGHT_MM
      
      // Center of this bead from top
      const centerFromTopMm = accMm + heightMm / 2
      const yWorld = TOP_Y - mm2u(centerFromTopMm)
      
      positions.push({ item, yWorld, heightMm })
      
      // Advance accumulator
      accMm += heightMm + SPACING_MM
    }
    
    // Total beads height (without the last spacing)
    const totalBeadsMm = sortedItems.length > 0 
      ? accMm - SPACING_MM - STEM_CLEARANCE_MM
      : 0
    
    // Calculate stem length
    const desiredStemMm = Math.max(
      STEM_MIN_MM,
      STEM_CLEARANCE_MM + totalBeadsMm + STEM_TAIL_MM
    )
    const stemLengthMm = clamp(desiredStemMm, STEM_MIN_MM, STEM_MAX_MM)
    const stemLengthUnits = mm2u(stemLengthMm)
    
    return { positions, stemLengthUnits }
  }, [state.placed, catalogById])

  const ringColor = state.params.colorTheme === 'gold' ? '#FFD700' : '#C0C0C0'

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, 5, -5]} intensity={0.4} />
      <directionalLight position={[0, -10, 0]} intensity={0.2} />

      {/* Keyring */}
      <KeyringMesh keyringId={state.keyringId} colorTheme={state.params.colorTheme} />

      {/* Dynamic stem */}
      <mesh position={[0, TOP_Y - beadLayout.stemLengthUnits / 2, 0]}>
        <cylinderGeometry args={[STEM_RADIUS, STEM_RADIUS, beadLayout.stemLengthUnits, STEM_SEGMENTS]} />
        <meshStandardMaterial color={ringColor} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Placed items */}
      {beadLayout.positions.map(({ item, yWorld }) => (
        <PlacedItemMesh
          key={item.uid}
          item={item}
          yPosition={yWorld}
          onRemove={onRemoveItem}
        />
      ))}

      {/* Contact shadows */}
      <ContactShadows opacity={0.4} scale={3} blur={2} far={2} resolution={256} color="#000000" />
    </>
  )
}

const DropZone = ({ isActive }: { isActive: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current && isActive) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  if (!isActive) return null

  return (
    <mesh ref={meshRef} position={[0, -2.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.5, 0.05, 8, 32]} />
      <meshBasicMaterial color="#4ECDC4" transparent opacity={0.6} />
    </mesh>
  )
}

export const ClassicCanvas = ({ 
  state, 
  isDragging, 
  draggedItem, 
  onDrop, 
  onRemoveItem 
}: ClassicCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedItem) {
      onDrop(draggedItem)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <Card className="h-[600px] overflow-hidden">
      <CardContent className="p-0 h-full">
        <div 
          className="h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 relative"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {isDragging && (
            <div className="absolute inset-4 border-2 border-dashed border-primary/50 rounded-lg z-10 pointer-events-none flex items-center justify-center">
              <div className="text-primary font-medium text-lg">
                Drop {draggedItem?.kind} here
              </div>
            </div>
          )}
          
          <Canvas
            ref={canvasRef}
            camera={{ position: [3, 3, 5], fov: 50 }}
            dpr={[1, 1.5]} // Limit device pixel ratio for performance
          >
            <Scene state={state} onRemoveItem={onRemoveItem} />
            <DropZone isActive={isDragging} />
            <OrbitControls 
              enablePan={true} 
              enableZoom={true} 
              enableRotate={true}
              minDistance={2}
              maxDistance={12}
              minPolarAngle={0}
              maxPolarAngle={Math.PI * 0.7} // Limit to keep top view readable
            />
            <Environment preset="studio" />
          </Canvas>
        </div>
      </CardContent>
    </Card>
  )
}