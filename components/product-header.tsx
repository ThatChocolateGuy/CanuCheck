// components/product-header.tsx
import { type EcommerceProduct } from '@/types/ecommerce'
import { CardTitle, CardDescription } from './ui/card'

export function ProductHeader({ product }: { product: EcommerceProduct }) {
  return (
    <div className="p-4 border-b">
      <CardTitle className="text-lg font-semibold">{product.name}</CardTitle>
      <CardDescription className="text-sm text-muted-foreground">
        {product.description}
      </CardDescription>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-bold">${product.price.toFixed(2)}</span>
        {/* Removed Visit Store link, navigation handled by View Product button */}
      </div>
    </div>
  )
}