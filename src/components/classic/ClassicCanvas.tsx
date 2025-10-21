import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { Card, CardContent } from '@/components/ui/card'
import { getSignedUrl } from '@/lib/storage'
import { getItemById, fetchCatalogItems } from '@/lib/catalog'
import type { PlacedItem, CatalogItem } from '@/lib/catalog'

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
  
  useEffect(() => {
    const loadModel = async () => {
      const item = await getItemById(keyringId)
      if (item) {
        const url = await getSignedUrl(item.glbPath.replace('/models/', ''))
        setModelUrl(url)
      }
    }
    loadModel()
  }, [keyringId])

  // Fallback geometry if GLB not available
  const ringGeometry = (
    <group position={[0, 2, 0]}>
      {/* Main ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.1, 8, 16]} />
        <meshStandardMaterial 
          color={colorTheme === 'gold' ? '#FFD700' : '#C0C0C0'} 
          metalness={0.8} 
          roughness={0.2} 
        />
      </mesh>
      
      {/* Connector chain */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial 
          color={colorTheme === 'gold' ? '#FFD700' : '#C0C0C0'} 
          metalness={0.8} 
          roughness={0.2} 
        />
      </mesh>
    </group>
  )

  // Try to load GLB, fallback to geometry
  if (modelUrl) {
    try {
      const { scene } = useGLTF(modelUrl)
      return <primitive object={scene} position={[0, 2, 0]} />
    } catch (error) {
      console.warn('Failed to load keyring GLB, using fallback geometry')
      return ringGeometry
    }
  }

  return ringGeometry
}

const PlacedItemMesh = ({ 
  item, 
  stackHeight, 
  onRemove 
}: { 
  item: PlacedItem; 
  stackHeight: number; 
  onRemove: (uid: string) => void 
}) => {
  const meshRef = useRef<THREE.Group>(null)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null)
  const [animationProgress, setAnimationProgress] = useState(0)
  
  useEffect(() => {
    const loadModel = async () => {
      const itemData = await getItemById(item.catalogId)
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


  // Calculate position based on stack - beads hang down from ring
  const targetY = 1.3 - stackHeight * 0.4 // Final position
  const startY = 3.5 // Start from above the ring
  const yPosition = startY + (targetY - startY) * animationProgress


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

  const content = modelUrl ? (
    (() => {
      try {
        const { scene } = useGLTF(modelUrl)
        return <primitive object={scene} scale={isHovered ? 1.1 : 1.0} />
      } catch (error) {
        return getFallbackGeometry()
      }
    })()
  ) : (
    getFallbackGeometry()
  )

  return (
    <group
      ref={meshRef}
      position={[0, yPosition, 0]}
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
      {content}
    </group>
  )
}

const Scene = ({ state, onRemoveItem }: { 
  state: ClassicCanvasProps['state']; 
  onRemoveItem: (uid: string) => void 
}) => {
  // Calculate cumulative heights for stacking - each item gets consistent spacing
  const getStackHeight = (index: number) => {
    // Return simple index-based spacing for clearer separation
    return index
  }

  // Calculate wire segments between beads
  const getWireSegments = () => {
    const segments: JSX.Element[] = []
    const sortedItems = state.placed.sort((a, b) => a.positionIndex - b.positionIndex)
    
    // Wire from ring to first bead
    if (sortedItems.length > 0) {
      const firstBeadY = 1.3
      const ringBottomY = 1.7
      const wireLength = ringBottomY - firstBeadY
      
      segments.push(
        <mesh key="wire-ring-to-first" position={[0, ringBottomY - wireLength / 2, 0]}>
          <cylinderGeometry args={[0.01, 0.01, wireLength, 8]} />
          <meshStandardMaterial color="#A0A0A0" metalness={0.8} roughness={0.2} />
        </mesh>
      )
    }
    
    // Wires between beads
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const currentY = 1.3 - i * 0.4
      const nextY = 1.3 - (i + 1) * 0.4
      const wireLength = currentY - nextY
      const wireCenterY = currentY - wireLength / 2
      
      segments.push(
        <mesh key={`wire-${i}`} position={[0, wireCenterY, 0]}>
          <cylinderGeometry args={[0.01, 0.01, wireLength, 8]} />
          <meshStandardMaterial color="#A0A0A0" metalness={0.8} roughness={0.2} />
        </mesh>
      )
    }
    
    return segments
  }

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, 5, -5]} intensity={0.4} />
      <directionalLight position={[0, -10, 0]} intensity={0.2} />

      {/* Keyring */}
      <KeyringMesh keyringId={state.keyringId} colorTheme={state.params.colorTheme} />

      {/* Wire segments */}
      {getWireSegments()}

      {/* Placed items */}
      {state.placed
        .sort((a, b) => a.positionIndex - b.positionIndex)
        .map((item, index) => (
          <PlacedItemMesh
            key={item.uid}
            item={item}
            stackHeight={getStackHeight(index)}
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