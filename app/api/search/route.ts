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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  // Mock data - replace with real API/LLM integration
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

  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

  return NextResponse.json(mockProducts.filter(p => 
    p.name.toLowerCase().includes(query?.toLowerCase() || '') && 
    p.canadianPercentage >= 50
  ));
}