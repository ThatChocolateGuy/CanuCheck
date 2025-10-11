import { NextResponse } from 'next/server';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  url: string;
  description: string;
  countries: { code: string; name: string; percentage: number }[];
  canadianPercentage: number;
}

// Configuration: Use gpt-5-nano as the default model
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

async function searchProductsWithLLM(query: string): Promise<Product[]> {
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not configured, using mock data');
    return getMockProducts(query);
  }

  try {
    const prompt = `Search for Canadian products matching: "${query}". 
Return a JSON array of products with the following structure for each product:
{
  "id": "unique-id",
  "name": "Product Name",
  "price": 99.99,
  "image": "/placeholder-product.jpg",
  "url": "https://example.com",
  "description": "Product description",
  "countries": [
    {"code": "ca", "name": "Canada", "percentage": 75},
    {"code": "us", "name": "USA", "percentage": 25}
  ],
  "canadianPercentage": 75
}

Only include products with canadianPercentage >= 50. Use lowercase ISO 3166-1 alpha-2 country codes.`;

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides product information about Canadian-made goods. Always respond with valid JSON arrays only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in API response');
    }

    // Parse the JSON response
    const products = JSON.parse(content);
    
    // Validate and filter products
    return products.filter((p: Product) => 
      p.canadianPercentage >= 50 &&
      p.name && p.price && p.description
    );
  } catch (error) {
    console.error('LLM search error:', error);
    // Fallback to mock data on error
    return getMockProducts(query);
  }
}

function getMockProducts(query: string): Product[] {
  const mockProducts: Product[] = [{
    id: "1",
    name: "Maple Wood Chair",
    price: 199.99,
    image: "/placeholder-chair.jpg",
    url: "https://example.com",
    description: "Handcrafted wooden chair using Canadian maple",
    countries: [{ code: "ca", name: "Canada", percentage: 100 }],
    canadianPercentage: 100
  }, {
    id: "2",
    name: "Smartphone",
    price: 899.99,
    image: "/placeholder-phone.jpg",
    url: "https://example.com",
    description: "Assembled in Canada with international components",
    countries: [
      { code: "ca", name: "Canada", percentage: 60 },
      { code: "us", name: "USA", percentage: 25 },
      { code: "cn", name: "China", percentage: 15 }
    ],
    canadianPercentage: 60
  }];

  return mockProducts.filter(p => 
    p.name.toLowerCase().includes(query?.toLowerCase() || '') && 
    p.canadianPercentage >= 50
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json([]);
  }

  const products = await searchProductsWithLLM(query);
  return NextResponse.json(products);
}