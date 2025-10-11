# LLM Agent Instructions for CanuCheck

## Project Overview
CanuCheck is a Smart Canadian Product Explorer that helps users discover truly Canadian-made goods with AI verification. The application combines real-time LLM-powered origin analysis to verify products meet the 50%+ Canadian content requirement.

## Tech Stack
- **Framework**: Next.js 15.3.0 (React 19.0.0)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui with Radix UI primitives
- **Icons**: Lucide React, Flag Icons
- **LLM Integration**: OpenAI API (configurable model)

## Project Structure
```
/app
  /api
    /search
      route.ts          # API endpoint for product search with LLM integration
  layout.tsx            # Root layout with fonts and metadata
  page.tsx              # Main page with ProductSearch component
  globals.css           # Global styles
/components
  /ui                   # shadcn/ui components (button, input, card, etc.)
  product-search.tsx    # Main search component with grid/list view
  product-card.tsx      # Product display card component
/lib
  utils.ts              # Utility functions (cn helper)
/types
  index.ts              # TypeScript interfaces (Product type)
/public                 # Static assets
```

## Key Features
1. **Product Search**: Search for Canadian products with real-time filtering
2. **LLM Verification**: AI-powered analysis of product origins and Canadian content percentage
3. **View Modes**: Grid and list view for product display
4. **Flag Display**: Visual representation of manufacturing countries with percentages
5. **Canadian Content Filter**: Only shows products with 50%+ Canadian content

## Development Guidelines

### Running the Application
```bash
npm install          # Install dependencies
npm run dev         # Start development server (with turbopack)
npm run build       # Build for production
npm run lint        # Run ESLint
```

### Code Style
- Use TypeScript for all new files
- Follow existing code patterns and naming conventions
- Use "use client" directive for components with React hooks
- Implement proper error handling with try-catch blocks
- Use async/await for asynchronous operations

### API Integration
The `/api/search` route currently uses mock data. When integrating with a real LLM:
- Use environment variables for API keys (OPENAI_API_KEY, OPENAI_MODEL)
- Implement rate limiting and error handling
- Return Product type matching the interface in `/types/index.ts`
- Filter results to only include products with canadianPercentage >= 50

### Product Type Structure
```typescript
interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  url: string;
  description: string;
  countries: {
    code: string;      // ISO 3166-1 alpha-2 country code (lowercase)
    name: string;      // Full country name
    percentage: number; // Manufacturing percentage (0-100)
  }[];
  canadianPercentage: number; // Must be >= 50 to display
}
```

### LLM Model Configuration
The application is designed to work with OpenAI-compatible APIs. Configuration should be done through environment variables:
- `OPENAI_API_KEY`: API key for authentication
- `OPENAI_MODEL`: Model to use (e.g., "gpt-5-nano", "gpt-4", "gpt-3.5-turbo")
- `OPENAI_BASE_URL`: (Optional) Custom API endpoint

### Common Tasks

#### Adding a New UI Component
1. Use shadcn/ui CLI if the component exists in their library
2. Place in `/components/ui/` directory
3. Follow Radix UI patterns for accessibility
4. Use Tailwind CSS for styling with the `cn()` utility

#### Modifying the Search API
1. Edit `/app/api/search/route.ts`
2. Keep the Product interface contract
3. Implement proper error handling
4. Test with various search queries
5. Ensure Canadian content filtering (>= 50%)

#### Updating Product Display
1. Modify `/components/product-card.tsx` for card appearance
2. Modify `/components/product-search.tsx` for layout/behavior
3. Test both grid and list view modes
4. Ensure flag icons display correctly

### Testing
- Test search functionality with various queries
- Verify Canadian content percentage filtering works
- Test grid/list view toggle
- Verify product cards display correctly with all data
- Test responsive design on different screen sizes

### Environment Variables
Create a `.env.local` file (not committed to git) with:
```
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5-nano
OPENAI_BASE_URL=https://api.openai.com/v1
```

### Important Notes
- The application uses Next.js App Router (not Pages Router)
- Server components are default; use "use client" only when needed
- API routes are in `/app/api/` directory
- Static assets go in `/public/` directory
- The app uses Tailwind CSS 4 (latest version with new features)

### Contribution Workflow
1. Create a feature branch
2. Make focused, minimal changes
3. Test thoroughly (dev server, build, lint)
4. Write clear commit messages
5. Submit PR with description of changes

### Debugging Tips
- Check browser console for client-side errors
- Check terminal output for server-side errors
- Use React DevTools for component inspection
- Use Network tab to inspect API calls
- Verify environment variables are loaded correctly

## Support
For questions or issues, refer to:
- Next.js docs: https://nextjs.org/docs
- shadcn/ui docs: https://ui.shadcn.com
- Tailwind CSS docs: https://tailwindcss.com/docs
- OpenAI API docs: https://platform.openai.com/docs
