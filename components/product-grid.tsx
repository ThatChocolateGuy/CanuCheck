'use client'

import React from 'react'
import { useMCP } from '@/lib/mcp'
import { GridSkeleton } from './grid-skeleton'
import { ProductCard } from './product-card'

export function ProductGrid({ viewMode, isLoading }: { viewMode: "grid" | "list", isLoading: boolean }) {
  const { results } = useMCP()
  const [isMounted, setIsMounted] = React.useState(false)

  useHydrationFix(() => setIsMounted(true))

  if (!isMounted || isLoading) return <GridSkeleton />

  return (
    <>
      {
        results.length > 0 ? (
          <div className={viewMode === "grid"
            ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            : "space-y-6"
          }>
            {results.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Search for Canadian products above
          </div>
        )
      }
    </>
  )
}

// Hydration workaround hook
function useHydrationFix(effect: () => void) {
  React.useEffect(() => {
    effect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps is intentional for mount-only effect
}