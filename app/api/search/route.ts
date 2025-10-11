import { EcommerceProduct, LLMProductResult } from '@/types/ecommerce'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 60 // Max duration in seconds (60s for Hobby plan)

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 45000, // 45 second timeout for OpenAI API calls
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
  results: [EcommerceProduct[], OpenAI.Responses.Response],
  query: string
): Promise<EcommerceProduct[]> {
  const [ecommerceResults, llmResponse] = results
  const llmProducts = await parseLLMResponse(llmResponse, openai, query)
  // console.log('LLM products:', llmProducts)

  // Deduplicate and combine results
  return [...ecommerceResults, ...llmProducts].filter(
    (product, index, self) =>
      self.findIndex(p => p.name === product.name) === index
  )
}

async function parseLLMResponse(
  response: OpenAI.Responses.Response,
  openai: OpenAI,
  query: string,
  retries = 3
): Promise<EcommerceProduct[]> {
  const content = response.output_text;
  // console.log('LLM response content:', content);

  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as LLMProductResult;
    // console.log('Parsed LLM response:', parsed);
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

    // if no valid products, try searching again
    if (validProducts.length === 0) {
      console.log('No valid products found, retrying...');
      if (retries > 0) {
        console.log(`Retrying fetch from OpenAI... (${retries} retries left)`);
        const newResponse = await fetchProducts(query)
        return await parseLLMResponse(newResponse, openai, query, retries - 1);
      }
      console.error(`Failed to parse LLM response after retries.`);
      return [];
    }

    return validProducts;
  } catch (error) {
    console.error('LLM parse error:', error);

    if (retries > 0) {
      console.log(`Retrying fetch from OpenAI... (${retries} retries left)`);
      const newResponse = await fetchProducts(query)
      return await parseLLMResponse(newResponse, openai, query, retries - 1);
    }

    console.error(`Failed to parse LLM response after retries.`);
    return [];
  }
}

async function fetchProducts(query: string) {
  // Set a timeout promise to race against the OpenAI call
  const timeoutPromise = new Promise<OpenAI.Responses.Response>((_, reject) => {
    setTimeout(() => reject(new Error('OpenAI request timeout after 40s')), 40000)
  })
  
  const apiPromise = openai.responses.create({
    model: "gpt-5-mini",
    reasoning: {
      effort: "low", // Reduce reasoning effort to save tokens for output
    },
    tools: [
      {
        type: "web_search_preview",
        search_context_size: "low",
        user_location: {
          country: "CA",
          type: "approximate",
        }
      },
    ],
    instructions: `
                    You are an expert in Canadian-made products. Perform a FAST web search for products claiming to be Canadian-made.
                    Find 3-5 products QUICKLY. Speed is critical.

                    Return results in JSON format (no markdown):
                    {
                      "products": [{ 
                        "id": string,
                        "name": string,
                        "price": number,
                        "available": boolean,
                        "images": string[], // valid image URLs only
                        "url": string, // product page URL
                        "description": string,
                        "manufacturer": string,
                        "countries": [{ "code": string, "name": string, "percentage"?: number }],
                        "canadianPercentage"?: number
                      }]
                    }
                    
                    CRITICAL: Complete search within 10 seconds. Return 3-5 products fast.
                    If fields are missing, exclude that product. Return empty array if no valid products found.
                    Valid JSON only - no markdown, no explanations, no incomplete responses.
                  `,
    input: `Find 3-5 Canadian-made products for: ${query}. URGENT: Return results within 10 seconds.`,
    max_output_tokens: 2000, // Further reduced for faster responses
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
    const mergedResults = await mergeResults(results, searchQuery);
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