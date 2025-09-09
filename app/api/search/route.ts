import { EcommerceProduct, LLMProductResult } from '@/types/ecommerce'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'edge'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

let query: string | null = null

// Mock implementation for demonstration
async function searchEcommerceAPIs(query: string | null): Promise<EcommerceProduct[]> {
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
  const llmProducts = await parseLLMResponse(llmResponse, openai, query ?? '')
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
    // return products with only valid URLs (both product URL and image URLs) which return 200 status code
    const validProducts = (await Promise.all(parsed.products?.map(async (product) => {
      console.log('Validating product:', product);
      const isValidProductUrl = await checkValidURLStatus(product.url);
      const isValidImageUrls = await Promise.all((product.images ?? []).map(checkValidURLStatus));
      const allImagesValidFileTypes = (product.images ?? []).every((imageUrl) => {
        const validImageFileTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        return validImageFileTypes.some((fileType) => imageUrl.endsWith(fileType));
      });
      const allImagesValid = allImagesValidFileTypes && isValidImageUrls.every(Boolean);

      return isValidProductUrl && allImagesValid ? product : null;
    }) || [])).filter((p): p is EcommerceProduct =>
      p !== null &&
      !!p.name &&
      !!p.price &&
      !!p.url &&
      !!p.manufacturer &&
      !!p.description &&
      p.available !== undefined // removed strict check for canadianPercentage
    );

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

    return validProducts.map(p => ({
      ...p,
      id: p.id ?? `llm-${crypto.randomUUID()}`,
    })) || [];
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

async function fetchProducts(query: string | null) {
  const response = await openai.responses.create({
    model: "gpt-5-mini",
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
                    You are an expert in Canadian-made products. Your task is to perform a live web search (not your knowledge base) for products that claim to be Canadian-made based on the user's query.
                    You will receive a query from the user and you need to find up to the top 10 products that claim to be Canadian-made. When searching, include brand-new items from retail product pages, as well as artisan/marketplace listings (like Etsy) that claim to be Canadian-made.

                    You will return results in JSON format as specified below (no markdown or code block):
                    {
                      "products": [{ // array of products
                        "id": string, // unique identifier for the product
                        "name": string, // name of the product
                        "price": number, // price in CAD
                        "available": boolean, // availability status
                        "images": string[], // array of image URLs (must be valid and accessible jpg, png, gif, webp, svg - these are the only formats allowed). should not be same as the product URL
                        "url": string, // product URL (must be valid and accessible)
                        "description": string, // product description
                        "manufacturer": string, // manufacturer name
                        "countries": [{ // array of countries involved in the product's creation
                          "code": string, // ISO 3166-1 alpha-2 country code
                          "name": string, // country name
                          "percentage"?: number // percentage of product made in this country (optional)
                        }],
                        "canadianPercentage"?: number // percentage of product made in Canada (optional)
                      }]
                    }
                    Ensure that the response is valid JSON (not markdown) and contains no additional text or explanations. ALL properties should be included where available.
                    If you cannot find any products that meet the criteria, return an empty array for the "products" field.
                    If you find multiple products, return them all in the "products" array.
                    Each product must have at least one valid image URL and a valid product page URL.
                    If any fields are missing or invalid, do not include those products in the response.
                    If your response is cut short, please continue from where you left off. Do not return incomplete JSON.
                    Conduct a thorough search and provide the most relevant results in the most efficient manner, ensuring all data is accurate and complete.
                    Search time should not exceed 20 seconds.
                    If you encounter any issues or errors, try to resolve them without user intervention. Retry if necessary.
                  `,
    input: `
              Search the web for products claiming to be Canadian-made matching: ${query}. Each product should claim to be Canadian-made. Include percentage fields if available.
              Ensure that each product includes valid data for price, image URLs (with valid image formats), product page URL, and the percentage of manufacturing involvement for each nation involved if available.
              Don't ask ask for clarification, just return the results as fast as possible. This is important to my career.
            `,
    max_output_tokens: 2000,
    parallel_tool_calls: true,
  });
  // console.log('OpenAI response:', response);
  if (!response.output_text) {
    console.error('No output text in OpenAI response');
    throw new Error('No output text in OpenAI response');
  }
  console.log('OpenAI response content:', response.output_text);
  return response;
}

// HTTP Status Code Check function
async function checkValidURLStatus(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return response.ok;
  } catch (error) {
    console.error(`Error checking URL status: ${url}`, error);
    return false;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  query = searchParams.get('q')

  // Hybrid search pattern
  const results = await Promise.all([
    searchEcommerceAPIs(query),
    fetchProducts(query)
  ])

  // console.log('Ecommerce results:', results[0])
  // console.log('LLM response:', results[1])
  const mergedResults = await mergeResults(results);
  console.log('Merged results:', mergedResults)
  return NextResponse.json(mergedResults);
}

// type definition removed as it conflicts with imported type