import { EcommerceProduct, LLMProductResult } from '@/types/ecommerce'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 60 // Max duration in seconds (60s for Hobby plan)

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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
  const response = await openai.responses.create({
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
                    Find up to 5-8 products quickly. Prioritize speed over quantity.

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
                    
                    CRITICAL: Complete search within 15 seconds. Return what you find quickly rather than waiting for comprehensive results.
                    If fields are missing, exclude that product. Return empty array if no valid products found.
                    Valid JSON only - no markdown, no explanations, no incomplete responses.
                  `,
    input: `Find Canadian-made products for: ${query}. Prioritize speed - return results within 15 seconds.`,
    max_output_tokens: 3000, // Reduced for faster responses
    parallel_tool_calls: true,
  });
  
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
  const { searchParams } = new URL(req.url)
  const searchQuery = searchParams.get('q') ?? ''

  // Hybrid search pattern
  const results = await Promise.all([
    searchEcommerceAPIs(searchQuery),
    fetchProducts(searchQuery)
  ])

  // console.log('Ecommerce results:', results[0])
  // console.log('LLM response:', results[1])
  const mergedResults = await mergeResults(results, searchQuery);
  console.log('Merged results:', mergedResults)
  return NextResponse.json(mergedResults);
}

// type definition removed as it conflicts with imported type