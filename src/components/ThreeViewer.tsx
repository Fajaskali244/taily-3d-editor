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

const OwlFaceBead = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Main bead body */}
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#8B4513" roughness={0.4} />
      </mesh>
      
      {/* Owl eyes */}
      <mesh position={[-0.06, 0.05, 0.12]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.06, 0.05, 0.12]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Owl pupils */}
      <mesh position={[-0.06, 0.05, 0.14]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.06, 0.05, 0.14]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      
      {/* Owl beak */}
      <mesh position={[0, -0.02, 0.13]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.02, 0.04, 3]} />
        <meshStandardMaterial color="#FFA500" />
      </mesh>
    </group>
  )
}

const BlueGlitterBead = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color="#4169E1" 
          metalness={0.7} 
          roughness={0.1}
          emissive="#001155"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Glitter particles */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const radius = 0.12
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const y = (Math.random() - 0.5) * 0.2
        
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.008, 4, 4]} />
            <meshStandardMaterial 
              color="#87CEEB" 
              metalness={1} 
              roughness={0}
              emissive="#ffffff"
              emissiveIntensity={0.3}
            />
          </mesh>
        )
      })}
    </group>
  )
}

const BlackPatternBead = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#2F2F2F" roughness={0.6} />
      </mesh>
      
      {/* Pattern stripes */}
      {Array.from({ length: 6 }).map((_, i) => {
        const y = -0.12 + (i * 0.04)
        return (
          <mesh key={i} position={[0, y, 0]}>
            <torusGeometry args={[0.13, 0.008, 4, 16]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        )
      })}
    </group>
  )
}

const SportsBead = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#FF6347" roughness={0.3} />
      </mesh>
      
      {/* Basketball lines */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.13, 0.005, 4, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[0.13, 0.005, 4, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI/2, 0]}>
        <torusGeometry args={[0.13, 0.005, 4, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
    </group>
  )
}

const renderBead = (bead: SelectedItem, position: [number, number, number]) => {
  switch (bead.name) {
    case "Owl Face Beads":
      return <OwlFaceBead key={`${bead.name}-${position.join('-')}`} position={position} />
    case "Blue Glitter Beads":
      return <BlueGlitterBead key={`${bead.name}-${position.join('-')}`} position={position} />
    case "Black Pattern Beads":
      return <BlackPatternBead key={`${bead.name}-${position.join('-')}`} position={position} />
    case "Sports Beads":
      return <SportsBead key={`${bead.name}-${position.join('-')}`} position={position} />
    default:
      return (
        <mesh key={`${bead.name}-${position.join('-')}`} position={position}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial 
            color={bead.color || "#ff6b9d"} 
            metalness={0.1} 
            roughness={0.3}
          />
        </mesh>
      )
  }
}

const KeychainPreview = ({ selectedItems }: { selectedItems: SelectedItem[] }) => {
  const beads = selectedItems.filter(item => item.type === 'bead')
  
  return (
    <Center>
      <group>
        {/* Main keyring */}
        <mesh position={[0, 2, 0]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.8, 0.1, 8, 32]} />
          <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Chain link */}
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
          <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Beads on chain */}
        {beads.map((bead, index) => 
          renderBead(bead, [0, 0.5 - index * 0.3, 0])
        )}
        
        {/* Bottom connector */}
        {beads.length > 0 && (
          <mesh position={[0, 0.5 - beads.length * 0.3 - 0.2, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
            <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
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