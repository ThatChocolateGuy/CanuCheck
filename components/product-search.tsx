"use client"

import { useMCP } from "@/lib/mcp"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { GridIcon, ListIcon, SearchIcon } from "lucide-react"
import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { ProductGrid } from "./product-grid"
import { Spinner } from "./ui/spinner"

export function ProductSearch() {
  const { query, results, search, analyze, analysis, isLoading } = useMCP()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [localQuery, setLocalQuery] = useState("")

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    search(localQuery)
  }

  const hasResults = results.length > 0

  return (
    <div className={`${!hasResults ? 'min-h-[70vh] flex flex-col justify-center' : 'space-y-8'}`}>
      {/* Search Bar */}
      <form
        onSubmit={handleSubmit}
        className={`
          flex gap-2
          ${!hasResults ? 'max-w-2xl mx-auto w-full flex-col space-y-4 p-8' : ''}
        `}
      >
        <Input
          placeholder="Search Canadian products..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className={`flex-1 ${!hasResults ? 'h-14 text-lg' : ''}`}
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            className={cn(
              'gap-2',
              !hasResults ? 'flex-1 h-12' : ''
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner /> Searching...
              </>
            ) : (
              <>
                <SearchIcon className="h-4 w-4" /> Search
              </>
            )}
          </Button>
          {hasResults && (
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => {
                if (value === "grid" || value === "list") {
                  setViewMode(value)
                }
              }}
              variant="outline"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view" title="Grid view">
                <GridIcon className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view" title="List view">
                <ListIcon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </form>

      {/* Results */}
      <ProductGrid viewMode={viewMode} isLoading={isLoading} />
    </div>
  )
}