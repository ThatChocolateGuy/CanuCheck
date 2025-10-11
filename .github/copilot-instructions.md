# CanuCheck AI Coding Agent Instructions

## Project Overview
CanuCheck is a Next.js 15 app helping users discover Canadian-made products. It combines AI-powered search with e-commerce aggregation, focusing on manufacturing transparency and supporting Canadian businesses.

## Architecture Patterns

### Hybrid Search Pattern
The core search functionality (`/api/search/route.ts`) uses a **hybrid approach**:
- Mock e-commerce API calls (placeholder for Shopify/Amazon integration)  
- OpenAI web search with gpt-5-mini model for real-time product discovery
- Results merged and deduplicated by product name
- URL validation ensures all product/image links return 200 status codes

### State Management with Zustand + Immer
- Global state in `lib/mcp.ts` using Zustand with Immer middleware
- Schema validation with Zod for runtime type safety
- Error boundaries handle API failures gracefully
- Products stored as `EcommerceProduct[]` with optional `canadianPercentage`

### Authentication & Rate Limiting
Analysis endpoint (`/api/analyze/route.ts`) supports dual auth:
- API key via `x-api-key` header (env: `API_KEY`)
- JWT via `Authorization: Bearer <token>` (env: `JWT_SECRET`) 
- Redis-based sliding window rate limiting (10 requests/minute per IP+key)
- Uses Upstash Redis for serverless compatibility

## Development Workflow

### Environment Setup
Required env vars in `.env.local`:
```bash
OPENAI_API_KEY=sk-...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
# Optional auth (at least one required for /api/analyze):
API_KEY=your-secret-key
JWT_SECRET=your-jwt-secret
```

### Running the App
```bash
pnpm dev          # Uses Next.js Turbopack for faster builds
pnpm build        # Production build
pnpm lint         # ESLint with Next.js config
```

## Component Conventions

### UI Components (shadcn/ui)
- Built on Radix primitives with Tailwind CSS v4
- `TooltipProvider` wrapped once at layout level (avoid nested providers)
- Custom components extend base UI: `ProductCard`, `ProductGrid`, `ProductSearch`

### TypeScript Patterns  
- Strict type definitions in `types/` directory
- Zod schemas for runtime validation (see `lib/mcp.ts`)
- Environment variables validated via `lib/env.ts`
- Optional chaining for product properties (`product.images ?? []`)

### Hydration Safety
Components use `useHydrationFix` pattern to prevent SSR mismatches:
```tsx
const [isMounted, setIsMounted] = React.useState(false)
useHydrationFix(() => setIsMounted(true))
if (!isMounted) return <Skeleton />
```

## API Integration

### OpenAI Configuration
- Edge runtime for search endpoint
- Web search enabled with Canadian geolocation
- Structured JSON responses validated against schemas
- Retry logic (3 attempts) for failed LLM parsing

### Error Handling Strategy
- Client errors (4xx): Return structured error with details
- Server errors (5xx): Log full context, return generic message  
- Network timeouts: 3-second limit for URL validation
- Rate limiting: 429 status with Redis sliding window

## Key Files to Understand
- `lib/mcp.ts` - Global state management and API integration
- `app/api/search/route.ts` - Core search logic with OpenAI integration
- `app/api/analyze/route.ts` - Product analysis with auth/rate limiting
- `components/product-search.tsx` - Main search interface with loading states
- `lib/auth.ts` - Dual authentication system (API key + JWT)

## Testing Product Analysis
Mock payload for `/api/analyze`:
```json
{
  "productId": "test-123",
  "name": "Canadian Maple Syrup", 
  "description": "Pure Quebec maple syrup",
  "price": 12.99,
  "url": "https://example.com/product"
}
```