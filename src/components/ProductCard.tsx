import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/hero-button"

interface ProductCardProps {
  name: string
  price: number
  image: string
  type?: 'bead' | 'charm' | 'keyring'
  color?: string
  onSelect: () => void
}

export const ProductCard = ({ name, price, image, type = 'bead', color = '#000000', onSelect }: ProductCardProps) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, name, color }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-grab active:cursor-grabbing" 
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="aspect-square mb-2 overflow-hidden rounded-lg bg-gray-50 relative">
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
        <h4 className="font-medium text-sm mb-1 text-center truncate">{name}</h4>
        <p className="text-xs text-primary font-semibold text-center">IDR 12,000</p>
      </CardContent>
    </Card>
  )
}