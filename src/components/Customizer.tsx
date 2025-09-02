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

interface SelectedItem {
  type: 'bead' | 'charm' | 'keyring'
  name: string
  color: string
}

const products = {
  beads: [
    { name: "Owl Face Beads", price: 12, image: owlBeads, color: "#8B4513" },
    { name: "Blue Glitter Beads", price: 8, image: blueGlitterBeads, color: "#4169E1" },
    { name: "Black Pattern Beads", price: 10, image: blackPatternBeads, color: "#2F2F2F" },
    { name: "Sports Beads", price: 15, image: sportsBeads, color: "#FF6347" }
  ],
  charms: [
    { name: "Heart Charm", price: 18, image: "/placeholder-charm.jpg", color: "#FF69B4" },
    { name: "Star Charm", price: 16, image: "/placeholder-charm.jpg", color: "#FFD700" },
    { name: "Moon Charm", price: 20, image: "/placeholder-charm.jpg", color: "#C0C0C0" }
  ],
  keyrings: [
    { name: "Classic Ring", price: 5, image: "/placeholder-keyring.jpg", color: "#C0C0C0" },
    { name: "Premium Ring", price: 8, image: "/placeholder-keyring.jpg", color: "#FFD700" }
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
    const product = Object.values(products).flat().find(p => p.name === item.name)
    return sum + (product?.price || 0)
  }, 0)

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Design Your Keychain</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose from our curated selection of beads, charms, and keyrings to create your perfect accessory
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Customization Panel */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-semibold mb-6">Customize Your Design</h3>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="beads">Beads</TabsTrigger>
                <TabsTrigger value="charms">Charms</TabsTrigger>
                <TabsTrigger value="keyrings">Keyrings</TabsTrigger>
              </TabsList>

              <TabsContent value="beads">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {products.beads.map((product) => (
                    <ProductCard
                      key={product.name}
                      name={product.name}
                      price={product.price}
                      image={product.image}
                      onSelect={() => addItem('bead', product.name, product.color)}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="charms">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {products.charms.map((product) => (
                    <ProductCard
                      key={product.name}
                      name={product.name}
                      price={product.price}
                      image={product.image}
                      onSelect={() => addItem('charm', product.name, product.color)}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="keyrings">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {products.keyrings.map((product) => (
                    <ProductCard
                      key={product.name}
                      name={product.name}
                      price={product.price}
                      image={product.image}
                      onSelect={() => addItem('keyring', product.name, product.color)}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 3D Preview Panel */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-semibold mb-4">3D Preview</h3>
              <ThreeViewer selectedItems={selectedItems} />
            </div>

            {selectedItems.length > 0 ? (
              <div className="bg-card p-6 rounded-lg border">
                <h4 className="font-semibold mb-4">Your Design</h4>
                <div className="space-y-2 mb-4">
                  {selectedItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span>${Object.values(products).flat().find(p => p.name === item.name)?.price}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 mb-4">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${totalPrice}</span>
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
              <div className="bg-muted/30 p-6 rounded-lg text-center">
                <p className="text-muted-foreground">Start selecting items to see your design</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}