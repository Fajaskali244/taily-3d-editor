import { useState } from "react"
import { ProductCard } from "./ProductCard"
import { ThreeViewer } from "./ThreeViewer"
import { Button } from "@/components/ui/hero-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Import your new bead images
import mixedBeads1 from "/lovable-uploads/0a4d5ff9-4858-49d0-9d46-feea6bddad5f.png"
import greenCollection from "/lovable-uploads/95c90cfe-8b53-43f4-98dd-5e18ddb8042c.png"
import pinkCollection from "/lovable-uploads/2df3af58-cc0a-4ed0-94bc-22d455e3de92.png"
import blueCollection from "/lovable-uploads/ca0615bb-75c5-4398-9a39-e1f376b726d9.png"
import flowerBeads from "/lovable-uploads/70150852-96f4-4647-b1f8-03e1d9738845.png"
import colorfulRings from "/lovable-uploads/fd0f7a7f-a63f-4048-98df-08e67d9bf4c9.png"
import pearlCollection1 from "/lovable-uploads/0e9e26b5-e325-47fb-869d-d7d8c89701d8.png"
import colorfulCord from "/lovable-uploads/42ee9036-1ee1-4c01-a72c-b4a7beb16f61.png"
import starKeyringSet from "/lovable-uploads/6bffac37-9623-4fdc-af3a-13882dc2413e.png"
import cableKeyrings from "/lovable-uploads/d526390d-9f3f-4601-b328-c13bc384c0a6.png"

interface SelectedItem {
  type: 'bead' | 'charm' | 'keyring'
  name: string
  color: string
}

const products = {
  beads: [
    { name: "Mixed Beads Collection", price: 6500, image: mixedBeads1, color: "#8B4513" },
    { name: "Green Rose Beads", price: 5200, image: greenCollection, color: "#4169E1" },
    { name: "Pink Heart Collection", price: 6800, image: pinkCollection, color: "#FF69B4" },
    { name: "Blue Star Beads", price: 5700, image: blueCollection, color: "#4169E1" },
    { name: "Flower Beads Set", price: 6100, image: flowerBeads, color: "#FF6347" },
    { name: "Pearl Collection White", price: 7000, image: pearlCollection1, color: "#F5F5DC" },
    { name: "Colorful Cord Collection", price: 5400, image: colorfulCord, color: "#FF69B4" }
  ],
  charms: [
    { name: "Star Keyring & Beads", price: 6000, image: starKeyringSet, color: "#FFD700" }
  ],
  keyrings: [
    { name: "Colorful Beaded Rings", price: 5000, image: colorfulRings, color: "#32CD32" },
    { name: "Cable Keyrings", price: 7000, image: cableKeyrings, color: "#87CEEB" }
  ]
}

export const Customizer = () => {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [activeTab, setActiveTab] = useState("beads")

  const addItem = (type: 'bead' | 'charm' | 'keyring', name: string, color: string) => {
    const newItem = { type, name, color }
    setSelectedItems(prev => [...prev, newItem])
  }

  const clearSelection = () => {
    setSelectedItems([])
  }

  const allProducts = [...products.beads, ...products.charms, ...products.keyrings]

  const totalPrice = selectedItems.reduce((total, item) => {
    const product = allProducts.find(p => p.name === item.name)
    return total + (product ? product.price : 12000)
  }, 0)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const itemData = e.dataTransfer.getData('application/json')
    if (itemData) {
      const { type, name, color } = JSON.parse(itemData)
      addItem(type, name, color)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Interactive Keychain Designer</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Drag and drop beads, charms, and keyrings onto the 3D visualizer to create your perfect keychain
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* 3D Visualizer - Left Side */}
          <div className="order-2 lg:order-1">
            <div className="bg-card rounded-xl border-2 border-dashed border-primary/20 p-6">
              <h3 className="text-2xl font-semibold mb-4 text-center">3D Visualizer</h3>
              <div 
                className="relative min-h-[500px] bg-gradient-to-b from-muted/30 to-muted/10 rounded-lg"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <ThreeViewer selectedItems={selectedItems} />
                <div className="absolute inset-x-0 bottom-4 text-center">
                  <p className="text-sm text-muted-foreground bg-background/80 rounded-full px-4 py-2 inline-block">
                    Drop items here to add to your keychain
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            {selectedItems.length > 0 ? (
              <div className="bg-card p-6 rounded-lg border mt-6">
                <h4 className="font-semibold mb-4">Your Design</h4>
                <div className="space-y-2 mb-4">
                  {selectedItems.map((item, index) => {
                    const product = allProducts.find(p => p.name === item.name)
                    const price = product ? product.price : 12000
                    return (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span>IDR {price.toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="border-t pt-4 mb-4">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>IDR {totalPrice.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button className="w-full" size="lg">
                    Add to Cart
                  </Button>
                  <Button variant="outline" className="w-full" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 p-6 rounded-lg text-center mt-6">
                <p className="text-muted-foreground">Drag items to the visualizer to start designing</p>
              </div>
            )}
          </div>

          {/* Selection Grid - Right Side */}
          <div className="order-1 lg:order-2">
            <h3 className="text-2xl font-semibold mb-6">Selection Panel</h3>
            <div className="bg-card p-6 rounded-lg border">
              <div className="grid grid-cols-4 gap-4">
                {allProducts.map((product, index) => (
                  <ProductCard
                    key={`${product.name}-${index}`}
                    name={product.name}
                    price={product.price}
                    image={product.image}
                    type={index < 7 ? 'bead' : index < 8 ? 'charm' : 'keyring'}
                    color={product.color}
                    onSelect={() => addItem(
                      index < 7 ? 'bead' : index < 8 ? 'charm' : 'keyring', 
                      product.name, 
                      product.color
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}