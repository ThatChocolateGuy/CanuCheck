// app/page.tsx
import { DOMCleanup } from '@/components/dom-cleanup'
import { ProductSearch } from '@/components/product-search'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <DOMCleanup />
      
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold tracking-tight">
            🇨🇦 CanuCheck
          </h1>
          <nav className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Verified Canadian Products
            </span>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-8 px-4">
        <ProductSearch />
      </main>

      {/* Footer */}
      <footer className="border-t bg-background mt-auto">
        <div className="container flex h-16 items-center px-4">
          <p className="text-sm text-muted-foreground">
            Supporting Canadian manufacturing since 2025
          </p>
        </div>
      </footer>
    </div>
  )
}