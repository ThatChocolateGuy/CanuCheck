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

// Validate if an image URL is accessible and returns an image
async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    // Basic URL validation
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Attempt to fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
    
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading the full image
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CanuCheck/1.0)',
      },
    });
    
    clearTimeout(timeoutId);
    
    // Check if response is OK and content-type is an image
    if (!response.ok) {
      return false;
    }
    
    const contentType = response.headers.get('content-type') || '';
    return contentType.startsWith('image/');
  } catch (error) {
    // Log validation failures for debugging
    console.warn(`Image URL validation failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
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
    
    // First pass: Basic field validation
    const candidateProducts = (parsed.products ?? []).filter((product): product is EcommerceProduct => {
      // Basic field validation
      if (!product.name || !product.price || !product.url || 
          !product.manufacturer || !product.description || 
          product.available === undefined) {
        return false;
      }
      
      // Validate images array exists and has at least one valid URL
      if (!Array.isArray(product.images) || product.images.length === 0) {
        console.warn(`Product "${product.name}" missing images array`);
        return false;
      }
      
      // Check for at least one non-empty image URL
      const hasValidImage = product.images.some(img => 
        typeof img === 'string' && img.trim() !== '' && 
        (img.startsWith('http://') || img.startsWith('https://'))
      );
      
      if (!hasValidImage) {
        console.warn(`Product "${product.name}" has no valid image URLs`);
        return false;
      }
      
      return true;
    });

    // Second pass: Validate images are actually accessible
    const validatedProducts = await Promise.all(
      candidateProducts.map(async (product): Promise<EcommerceProduct | null> => {
        const imageUrls = (product.images ?? []).filter(img => 
          typeof img === 'string' && img.trim() !== '' && 
          (img.startsWith('http://') || img.startsWith('https://'))
        );
        
        // Validate each image URL in parallel with a limit
        const validationResults = await Promise.all(
          imageUrls.map(url => isValidImageUrl(url))
        );
        
        // Keep only images that passed validation
        const validImages = imageUrls.filter((_, index) => validationResults[index]);
        
        // Return product with validated images, or null if no valid images remain
        if (validImages.length === 0) {
          console.warn(`Product "${product.name}" has no accessible images after validation`);
          return null;
        }
        
        return {
          ...product,
          id: product.id ?? `llm-${crypto.randomUUID()}`,
          images: validImages
        } as EcommerceProduct;
      })
    );

    // Filter out products that failed image validation
    return validatedProducts.filter((p): p is EcommerceProduct => p !== null);
  } catch (error) {
    console.error('LLM parse error:', error);
    // Return empty array instead of retrying
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
    instructions: `Find 3 Canadian-made products with CURRENT pricing and valid product images. Return JSON only:
{"products":[{"id":"string","name":"string","price":number,"available":true,"images":["https://valid-image-url.jpg","https://another-image.jpg"],"url":"https://product-page.com","description":"string","manufacturer":"string","countries":[{"code":"CA","name":"Canada"}],"canadianPercentage":100}]}
CRITICAL REQUIREMENTS:
1. Extract CURRENT price directly from the product page (not cached/outdated prices)
2. Verify price matches what's shown on the actual product URL
3. Include direct image URLs from product pages (not thumbnails)
4. All image URLs must be publicly accessible
Complete in 8 seconds. No markdown.`,
    input: `${query} Canadian-made products. Find current prices and valid images from product pages. Return 3 products in 8 seconds.`,
    max_output_tokens: 1500,
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