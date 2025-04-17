"use client";

import { Card } from "@/components/ui/card";
import { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <a href={product.url} target="_blank" rel="noopener noreferrer">
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg">
        <div className="relative aspect-square">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            {product.description}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className="font-bold">${product.price.toFixed(2)}</span>
            <div className="flex gap-1">
              {product.canadianPercentage === 100 ? (
                <span className="fi fi-ca" title="100% Canadian Made" />
              ) : (
                product.countries.map((country) => (
                  <span
                    key={country.code}
                    className={`fi fi-${country.code}`}
                    title={`${country.percentage}% ${country.name}`}
                  />
                ))
              )}
            </div>
          </div>
          <div className="mt-4 w-full">
            <div className="relative h-2 rounded-full bg-gray-200">
              <div
                className="absolute left-0 top-0 h-2 rounded-full bg-blue-600"
                style={{ width: `${product.canadianPercentage}%` }}
              />
            </div>
            <p className="mt-1 text-right text-sm text-muted-foreground">
              {product.canadianPercentage}% Canadian
            </p>
          </div>
        </div>
      </Card>
    </a>
  );
}