import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { z } from 'zod'
import { EcommerceProduct } from '@/types/ecommerce'

const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  images: z.array(z.string().url()).optional(),
  url: z.string().url(),
  manufacturer: z.string().optional(),
  description: z.string(),
  countries: z.array(z.object({
    code: z.string().length(2),
    name: z.string(),
    percentage: z.number().min(0).max(100)
  })),
  canadianPercentage: z.number().min(0).max(100).optional(),
  available: z.boolean().default(true)
})

// Define a type for analysis results (customize as needed)
export type AnalysisResult = {
  summary: string;
  score?: number;
  [key: string]: unknown;
};

type MCPState = {
  query: string
  results: z.infer<typeof ProductSchema>[]
  analysis: Record<string, AnalysisResult>
  error: string | null
  isLoading: boolean
}

type MCPActions = {
  search: (query: string) => Promise<void>
  analyze: (product: EcommerceProduct) => Promise<void>
}

export const useMCP = create<MCPState & MCPActions>()(immer((set) => ({
  query: '',
  results: [],
  analysis: {},
  error: null,
  isLoading: false,
  search: async (query) => {
    set(state => {
      state.error = null;
      state.isLoading = true;
    });
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) {
      set(state => {
        state.error = `Search failed: ${res.status} ${res.statusText}`;
        state.isLoading = false;
      });
      throw new Error(`Search failed: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    set(state => {
      state.results = ProductSchema.array().parse(data);
      state.isLoading = false;
    })
  },
  analyze: async (product) => {
    set({ error: null });
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: product.id,
          name: product.name,
          description: product.description
        })
      })
      
      if (!response.ok) throw new Error('Analysis failed')
      
      const data: AnalysisResult = await response.json()
      
      set((state) => {
        state.analysis[product.id] = data
      })
      
    } catch (error) {
      console.error('Analysis error:', error)
      set({ error: error instanceof Error ? error.message : String(error) });
    }
  }
})))