import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/hero-button"

interface ProductCardProps {
  name: string
  price: number
  image: string
  onSelect: () => void
}

export const ProductCard = ({ name, price, image, onSelect }: ProductCardProps) => {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={onSelect}>
      <CardContent className="p-6">
        <div className="aspect-square mb-4 overflow-hidden rounded-lg bg-gray-50">
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <h3 className="font-semibold text-lg mb-2">{name}</h3>
        <p className="text-2xl font-bold text-primary mb-4">${price}</p>
        <Button 
          variant="outline" 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
        >
          Add to Design
        </Button>
      </CardContent>
    </Card>
  )
}