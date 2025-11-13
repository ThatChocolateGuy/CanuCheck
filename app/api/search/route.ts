import { EcommerceProduct, LLMProductResult } from '@/types/ecommerce'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 30 // Reduced to 30s - should complete much faster now

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 25000, // 25 second timeout
})

// Mock implementation for demonstration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function searchEcommerceAPIs(_query: string): Promise<EcommerceProduct[]> {
  // Replace with actual API calls to:
  // - Shopify API
  // - Amazon Product Advertising API
  // - Canada-specific marketplaces

  // For now, we return mock data with a variety of Canadian-made or partially Canadian products
  return Promise.resolve([
    //   {
    //   id: "mock-1",
    //   name: "Canadian Maple Syrup",
    //   price: 12.99,
    //   images: ["https://placehold.co/600x400", "https://placehold.co/600x400", "https://placehold.co/600x400"],
    //   url: "https://example.com/maple-syrup",
    //   description: "Pure Quebec maple syrup, 100% Canadian made",
    //   manufacturer: "MapleCo Canada",
    //   countries: [{ code: "CA", name: "Canada", percentage: 90 }, { code: "US", name: "United States", percentage: 10 }],
    //   canadianPercentage: 90, // This can now be omitted for some products
    //   available: true
    // }
  ])
}

async function mergeResults(
  results: [EcommerceProduct[], OpenAI.Responses.Response]
): Promise<EcommerceProduct[]> {
  const [ecommerceResults, llmResponse] = results
  const llmProducts = await parseLLMResponse(llmResponse)
  // console.log('LLM products:', llmProducts)

  // Deduplicate and combine results
  return [...ecommerceResults, ...llmProducts].filter(
    (product, index, self) =>
      self.findIndex(p => p.name === product.name) === index
  )
}

async function parseLLMResponse(
  response: OpenAI.Responses.Response
): Promise<EcommerceProduct[]> {
  const content = response.output_text;

  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as LLMProductResult;
    
    const validProducts = (parsed.products ?? []).filter((product): product is EcommerceProduct => {
      // Basic field validation
      if (!product.name || !product.price || !product.url || 
          !product.manufacturer || !product.description || 
          product.available === undefined) {
        console.warn(`Product "${product.name}" failed basic validation`);
        return false;
      }
      
      // Validate images array exists and has at least one valid URL
      if (!Array.isArray(product.images) || product.images.length === 0) {
        console.warn(`Product "${product.name}" missing images array`);
        return false;
      }
      
      // Check for at least one non-empty, non-placeholder image URL
      const hasValidImage = product.images.some(img => {
        if (typeof img !== 'string' || img.trim() === '') return false;
        if (!img.startsWith('http://') && !img.startsWith('https://')) return false;
        
        // Filter out common placeholder domains
        const placeholderDomains = ['placehold.co', 'placeholder.com', 'lorempixel', 'dummyimage', 'via.placeholder'];
        const lowerImg = img.toLowerCase();
        if (placeholderDomains.some(domain => lowerImg.includes(domain))) {
          return false;
        }
        
        return true;
      });
      
      if (!hasValidImage) {
        console.warn(`Product "${product.name}" has no valid non-placeholder image URLs`);
        return false;
      }
      
      return true;
    }).map(p => ({
      ...p,
      id: p.id ?? `llm-${crypto.randomUUID()}`,
      // Filter out any empty/invalid/placeholder image URLs
      images: (p.images ?? []).filter(img => {
        if (typeof img !== 'string' || img.trim() === '') return false;
        if (!img.startsWith('http://') && !img.startsWith('https://')) return false;
        
        // Filter out placeholder domains
        const placeholderDomains = ['placehold.co', 'placeholder.com', 'lorempixel', 'dummyimage', 'via.placeholder'];
        const lowerImg = img.toLowerCase();
        return !placeholderDomains.some(domain => lowerImg.includes(domain));
      })
    }));

    console.log(`Parsed ${validProducts.length} valid products from LLM response`);
    return validProducts;
  } catch (error) {
    console.error('LLM parse error:', error);
    return [];
  }
}

async function fetchProducts(query: string) {
  // Set timeout slightly less than client timeout (25s)
  const timeoutPromise = new Promise<OpenAI.Responses.Response>((_, reject) => {
    setTimeout(() => reject(new Error('OpenAI request timeout after 23s')), 23000)
  })
  
  const apiPromise = openai.responses.create({
    model: "gpt-5-mini",
    reasoning: {
      effort: "low",
    },
    tools: [
      {
        type: "web_search_preview",
        search_context_size: "low", // Minimal context for speed
        user_location: {
          country: "CA",
          type: "approximate",
        }
      },
    ],
    tool_choice: { type: "web_search_preview" },
    instructions: `You are a product search assistant specializing in Canadian-made products. Search for real, currently available products matching the user's query.

REQUIRED OUTPUT FORMAT (JSON only, no markdown):
{"products":[{"id":"product-sku-123","name":"Exact Product Name","price":19.99,"available":true,"images":["https://cdn.example.com/product1.jpg","https://cdn.example.com/product2.jpg"],"url":"https://store.example.com/product-page","description":"Detailed product description","manufacturer":"Company Name Inc.","countries":[{"code":"CA","name":"Canada","percentage":100}],"canadianPercentage":100}]}

CRITICAL INSTRUCTIONS:
1. PRICING: Extract the CURRENT, ACTIVE price shown on the product page right now (not sale prices from the past, not "was" prices). If you see multiple prices, use the current selling price. Include currency conversions if needed - prices should be in CAD.

2. IMAGES: Find actual product images from the product page or CDN. Requirements:
   - Use full-size product images (not thumbnails ending in -thumb, -small, etc.)
   - Images must be from the actual product domain or known CDN (cdn., images., static., etc.)
   - Include 2-3 different product images if available
   - Verify images are publicly accessible (no login-walled images)
   - DO NOT use placeholder images (no placehold.co, placeholder.com, lorempixel, etc.)
   
3. PRODUCT URL: Use the direct product detail page URL (not search results, not category pages)

4. MANUFACTURER: Extract the actual brand or manufacturer name from the product page

5. DESCRIPTION: Write a concise 1-2 sentence description including key product features

6. CANADIAN VERIFICATION: Only include products that are actually made in Canada. Check:
   - Product description mentions "Made in Canada" or "Canadian-made"
   - Manufacturer is Canadian company
   - Product details indicate Canadian origin

7. AVAILABILITY: Only include products that are currently in stock and available for purchase

Return exactly 3 products. Complete search in 8 seconds. No markdown formatting - pure JSON only.`,
    input: `Search for: "${query}". Find 3 real Canadian-made products currently available online with verified images and current pricing.`,
    max_output_tokens: 2000,
    parallel_tool_calls: true,
  });
  
  const response = await Promise.race([apiPromise, timeoutPromise]);
  
  console.log('OpenAI response structure:', JSON.stringify(response, null, 2));
  
  if (!response.output_text) {
    console.error('No output text in OpenAI response. Full response:', response);
    // Return empty response instead of throwing to allow graceful degradation
    return { output_text: JSON.stringify({ products: [] }) } as OpenAI.Responses.Response;
  }
  console.log('OpenAI response content:', response.output_text);
  return response;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const searchQuery = searchParams.get('q') ?? ''

    if (!searchQuery) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    // Hybrid search pattern with timeout handling
    const results = await Promise.all([
      searchEcommerceAPIs(searchQuery),
      fetchProducts(searchQuery).catch(error => {
        console.error('OpenAI fetch error:', error)
        // Return empty response on timeout/error to allow graceful degradation
        return { output_text: JSON.stringify({ products: [] }) } as OpenAI.Responses.Response
      })
    ])

    // console.log('Ecommerce results:', results[0])
    // console.log('LLM response:', results[1])
    const mergedResults = await mergeResults(results);
    console.log('Merged results:', mergedResults)
    return NextResponse.json(mergedResults);
  } catch (error) {
    console.error('Search endpoint error:', error)
    return NextResponse.json(
      { error: 'An error occurred while searching for products' },
      { status: 500 }
    )
  }
}

// type definition removed as it conflicts with imported type