// components/product-card.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { type EcommerceProduct } from "@/types/ecommerce"
import { ProductHeader } from "./product-header"

export function ProductCard({
  product,
}: {
  product: EcommerceProduct
}) {
  // Safely validate and open external product URLs
  const openProductUrlSafely = () => {
    try {
      const url = new URL(product.url);
      const allowed = new Set(["http:", "https:"]);
      if (!allowed.has(url.protocol)) {
        console.warn("Blocked navigation to disallowed protocol:", url.protocol);
        return;
      }
      const newWin = window.open(url.toString(), '_blank', 'noopener,noreferrer');
      if (newWin) newWin.opener = null; // extra safety
    } catch (e) {
      console.warn("Invalid product URL, navigation aborted:", product.url, e);
    }
  }
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <ProductHeader product={product} />
      </CardHeader>

      <CardContent className="flex flex-col items-center">
        {/* Carousel for product images */}
        <Carousel className="w-full max-w-xs mx-auto">
          <CarouselContent>
            {(product.images ?? []).map((imageUrl, index) => (
              <CarouselItem key={index}>
                <img
                  src={imageUrl && imageUrl.trim() !== '' ? imageUrl : "https://placehold.co/600x400"}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-auto object-cover rounded-md"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-0 transform translate-x-1/2" />
          <CarouselNext className="absolute right-0 transform -translate-x-1/2" />
        </Carousel>
      </CardContent>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={openProductUrlSafely}
        >
          View Product
        </Button>
      </div>
    </Card>
  )
}