import { useState } from "react"
import { ProductCard } from "./ProductCard"
import { ThreeViewer } from "./ThreeViewer"
import { Button } from "@/components/ui/hero-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Import the generated images
import owlBeads from "@/assets/owl-beads.jpg"
import blueGlitterBeads from "@/assets/blue-glitter-beads.jpg"
import blackPatternBeads from "@/assets/black-pattern-beads.jpg"
import sportsBeads from "@/assets/sports-beads.jpg"
import heartCharm from "@/assets/heart-charm.jpg"
import starCharm from "@/assets/star-charm.jpg"
import moonCharm from "@/assets/moon-charm.jpg"
import classicKeyring from "@/assets/classic-keyring.jpg"
import premiumKeyring from "@/assets/premium-keyring.jpg"

interface SelectedItem {
  type: 'bead' | 'charm' | 'keyring'
  name: string
  color: string
}

const products = {
  beads: [
    { name: "Owl Face Beads", price: 12000, image: owlBeads, color: "#8B4513" },
    { name: "Blue Glitter Beads", price: 12000, image: blueGlitterBeads, color: "#4169E1" },
    { name: "Black Pattern Beads", price: 12000, image: blackPatternBeads, color: "#2F2F2F" },
    { name: "Sports Beads", price: 12000, image: sportsBeads, color: "#FF6347" }
  ],
  charms: [
    { name: "Heart Charm", price: 12000, image: heartCharm, color: "#FF69B4" },
    { name: "Star Charm", price: 12000, image: starCharm, color: "#FFD700" },
    { name: "Moon Charm", price: 12000, image: moonCharm, color: "#C0C0C0" }
  ],
  keyrings: [
    { name: "Classic Ring", price: 12000, image: classicKeyring, color: "#C0C0C0" },
    { name: "Premium Ring", price: 12000, image: premiumKeyring, color: "#FFD700" }
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

  const totalPrice = selectedItems.reduce((sum, item) => {
    const allProducts = [...products.beads, ...products.charms, ...products.keyrings]
    const product = allProducts.find(p => p.name === item.name)
    return sum + (product?.price || 0)
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

  const allProducts = [...products.beads, ...products.charms, ...products.keyrings]

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
                    const allProducts = [...products.beads, ...products.charms, ...products.keyrings]
                    const product = allProducts.find(p => p.name === item.name)
                    return (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span>IDR {(product?.price || 0).toLocaleString()}</span>
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
                    type={index < 4 ? 'bead' : index < 7 ? 'charm' : 'keyring'}
                    color={product.color}
                    onSelect={() => addItem(
                      index < 4 ? 'bead' : index < 7 ? 'charm' : 'keyring', 
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