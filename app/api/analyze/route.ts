import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'

const analysisSchema = z.object({
  productId: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  url: z.string().url()
})

const responseSchema = z.object({
  countries: z.array(
    z.object({
      code: z.string().length(2),
      name: z.string(),
      percentage: z.number().min(0).max(100)
    })
  ),
  canadianPercentage: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1)
})
// Simple in-memory rate limiter (for demonstration; use Redis or similar for production)
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per window

// Add cleanup mechanism
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.lastRequest > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

function getClientKey(req: Request): string {
  // Use IP address or a header as a simple client key (for demonstration)
  // In production, use a more robust method
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function isRateLimited(clientKey: string) {
  const now = Date.now();
  const entry = rateLimitMap.get(clientKey);
  if (!entry || now - entry.lastRequest > RATE_LIMIT_WINDOW_MS) {
    // Clean up expired entry
    if (entry && now - entry.lastRequest > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(clientKey);
    }
    rateLimitMap.set(clientKey, { count: 1, lastRequest: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }
  entry.count++;
  entry.lastRequest = now;
  rateLimitMap.set(clientKey, entry);
  return false;
}

function sanitizeInput(str: string): string {
  // Remove dangerous characters and excessive whitespace
  return str.replace(/[\r\n\t\0\f\b]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function POST(req: Request) {
  // --- API Key/JWT Authentication ---
  // Removed duplicate apiKey declaration
  const authHeader = req.headers.get('authorization');
  const validApiKey = process.env.API_KEY;

  // Constant-time string comparison to prevent timing attacks
  function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  // --- API Key/JWT Authentication ---
  const apiKey = req.headers.get('x-api-key');
  // For JWT, you would verify the token here (not implemented for brevity)
  if (!apiKey && !authHeader) {
    return NextResponse.json({ error: 'Unauthorized: Missing API key or token' }, { status: 401 });
  }
  if (validApiKey && apiKey && !constantTimeEqual(apiKey, validApiKey)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 });
  }

  // --- Rate Limiting ---
  const clientKey = getClientKey(req);
  if (isRateLimited(clientKey)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  try {
    // Validate and sanitize input
    const rawBody = await req.json();
    const sanitizedBody = {
      ...rawBody,
      name: sanitizeInput(rawBody.name || ''),
      description: sanitizeInput(rawBody.description || ''),
      url: sanitizeInput(rawBody.url || ''),
    };
    const input = analysisSchema.parse(sanitizedBody)

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set")
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const prompt = `
      Analyze manufacturing origins for product: ${input.name}
      Price: ${input.price}
      Description: ${input.description}
      URL: ${input.url}

      Output JSON format:
      {
        "countries": [{
          "code": string, // 2-letter country code
          "name": string, // full country name
          "percentage": number // percentage of the product made in this country
        }],
        "canadianPercentage": number, // percentage of the product made in Canada
        "confidence": number // confidence level of the analysis (0 to 1)
      }
    `

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert in product analysis and manufacturing origins."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: 'gpt-4o-mini-search-preview-2025-03-11',
      web_search_options: {
        user_location: {
          type: "approximate",
          approximate: {
            country: "CA"
          },
        },
      }
    })

    const rawAnalysis = completion.choices[0].message.content
    if (!rawAnalysis) throw new Error("No analysis content")

    const parsedAnalysis = JSON.parse(rawAnalysis)
    const validatedAnalysis = responseSchema.parse(parsedAnalysis)

    return NextResponse.json({
      ...validatedAnalysis,
      source: completion.model,
      productId: input.productId
    })

  } catch (error) {
    console.error("Analysis failed:", error)
    return NextResponse.json(
      { error: "Product analysis failed" },
      { status: 500 }
    )
  }
}