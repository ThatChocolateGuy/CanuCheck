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
    percentage: z.number().min(0).max(100).optional() // Made optional
  })),
  canadianPercentage: z.number().min(0).max(100).optional(),
  available: z.boolean().default(true)
})

// Runtime schema and type for generic analysis results
const AnalysisResultSchema = z.object({
  summary: z.string(),
  score: z.number().optional(),
}).passthrough(); // allow additional unknown keys

// (moved below after AnalysisResponseSchema)

// Minimal runtime schema for analysis API response
const AnalysisResponseSchema = z.object({
  countries: z.array(z.object({
    code: z.string().length(2),
    name: z.string(),
    percentage: z.number().min(0).max(100).optional(),
  })),
  canadianPercentage: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  // optional extras returned by the API
  productId: z.string().optional(),
  source: z.string().optional(),
}).strict();

// Allow either our generic result or the structured API response
const AnyAnalysisSchema = z.union([AnalysisResponseSchema, AnalysisResultSchema]);

export type AnalysisResult = z.infer<typeof AnyAnalysisSchema>;

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
    // Initialize search state
    set(state => {
      state.query = query;
      state.error = null;
      state.isLoading = true;
      state.results = []; // Clear previous results
    });

    try {
      // Fetch results
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) {
        throw new Error(`Search failed: ${res.status} ${res.statusText}`);
      }

      // Parse JSON response
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Failed to parse search results as JSON');
      }

      // Validate response data
      const parseResult = ProductSchema.array().safeParse(data);
      if (!parseResult.success) {
        throw new Error(`Invalid search results: ${parseResult.error.message}`);
      }

      // Update state with validated results
      set(state => {
        state.results = parseResult.data;
      });
    } catch (error) {
      // Handle all errors consistently
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      set(state => {
        state.error = errorMessage;
        state.results = []; // Clear invalid results
      });
    } finally {
      // Always ensure loading state is reset
      set(state => {
        state.isLoading = false;
      });
    }
  },
  analyze: async (product) => {
    set({ error: null });
    try {
      const payload = {
        productId: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        url: product.url,
      };

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Always read body as text first
      const rawBody = await response.text();
      const truncate = (s: string, n = 1500) => (s && s.length > n ? s.slice(0, n) + '…' : s);

      if (!response.ok) {
        throw new Error(
          `Analysis failed: ${response.status} ${response.statusText}. Body: ${truncate(rawBody)}`
        );
      }

      // Parse JSON with error surfacing
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Analysis response parse error: ${msg}. Body: ${truncate(rawBody)}`);
      }

  // Validate shape (support both structured API response and generic summary/score)
  const validation = AnyAnalysisSchema.safeParse(parsed);
      if (!validation.success) {
        throw new Error(
          `Invalid analysis response: ${validation.error.message}. Body: ${truncate(rawBody)}`
        );
      }

      // Store under product.id
      set((state) => {
        state.analysis[product.id] = validation.data;
      });

    } catch (error) {
      console.error('Analysis error:', error);
      set({ error: error instanceof Error ? error.message : String(error) });
    }
  }
})))