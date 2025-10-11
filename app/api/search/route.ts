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
  timeout: 20000, // 20 second timeout - much more aggressive
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
    // Skip URL validation to avoid timeouts - trust OpenAI's web search results
    const validProducts = (parsed.products ?? []).filter((product): product is EcommerceProduct =>
      !!product.name &&
      !!product.price &&
      !!product.url &&
      !!product.manufacturer &&
      !!product.description &&
      product.available !== undefined
    ).map(p => ({
      ...p,
      id: p.id ?? `llm-${crypto.randomUUID()}`
    }));

    // Return whatever we got - no retries to avoid timeouts
    return validProducts;
  } catch (error) {
    console.error('LLM parse error:', error);
    // Return empty array instead of retrying
    return [];
  }
}

async function fetchProducts(query: string) {
  // Set a much more aggressive timeout - 18 seconds max
  const timeoutPromise = new Promise<OpenAI.Responses.Response>((_, reject) => {
    setTimeout(() => reject(new Error('OpenAI request timeout after 18s')), 18000)
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
    instructions: `Find 3 Canadian-made products. Return JSON only:
{"products":[{"id":"","name":"","price":0,"available":true,"images":[""],"url":"","description":"","manufacturer":"","countries":[{"code":"CA","name":"Canada"}],"canadianPercentage":100}]}
Complete in 8 seconds. No markdown. No explanations.`,
    input: `${query} Canadian-made. Return 3 products in 8 seconds.`,
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