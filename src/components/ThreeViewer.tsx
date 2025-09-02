import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Center } from "@react-three/drei"
import { Suspense, useState, useEffect } from "react"

interface SelectedItem {
  type: 'bead' | 'charm' | 'keyring'
  name: string
  color: string
}

interface ThreeViewerProps {
  selectedItems: SelectedItem[]
}

const KeychainPreview = ({ selectedItems }: { selectedItems: SelectedItem[] }) => {
  const beads = selectedItems.filter(item => item.type === 'bead')
  
  return (
    <Center>
      <group>
        {/* Main keyring */}
        <mesh position={[0, 2, 0]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.8, 0.1, 8, 32]} />
          <meshStandardMaterial color="#silver" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Chain link */}
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
          <meshStandardMaterial color="#silver" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Beads on chain */}
        {beads.map((bead, index) => (
          <mesh key={index} position={[0, 0.5 - index * 0.3, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial 
              color={bead.color || "#ff6b9d"} 
              metalness={0.1} 
              roughness={0.3}
            />
          </mesh>
        ))}
        
        {/* Bottom connector */}
        {beads.length > 0 && (
          <mesh position={[0, 0.5 - beads.length * 0.3 - 0.2, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
            <meshStandardMaterial color="#silver" metalness={0.8} roughness={0.2} />
          </mesh>
        )}
      </group>
    </Center>
  )
}

export const ThreeViewer = ({ selectedItems }: ThreeViewerProps) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-96 bg-gradient-secondary rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading 3D preview...</p>
      </div>
    )
  }

  return (
    <div className="w-full h-96 bg-gradient-secondary rounded-lg overflow-hidden">
      <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          
          <KeychainPreview selectedItems={selectedItems} />
          
          <OrbitControls 
            enablePan={false} 
            enableZoom={true}
            minDistance={2}
            maxDistance={8}
            autoRotate={selectedItems.length === 0}
            autoRotateSpeed={2}
          />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  )
}