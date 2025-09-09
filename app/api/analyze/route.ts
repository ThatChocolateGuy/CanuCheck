import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { verifyApiKey, verifyJWT, extractBearerToken } from '@/lib/auth'

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
import { RateLimiter } from '@/lib/rate-limiter'

const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 10 // max 10 requests per window

function getClientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  // Include API key in rate limit key if present to separate authenticated requests
  const apiKey = req.headers.get('x-api-key')
  return apiKey ? `${ip}:${apiKey}` : ip
}

async function isRateLimited(clientKey: string): Promise<boolean> {
  const limiter = RateLimiter.getInstance()
  return limiter.isRateLimited(clientKey, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)
}

function sanitizeInput(str: string): string {
  // Remove dangerous characters and excessive whitespace
  return str.replace(/[\r\n\t\0\f\b]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function POST(req: Request) {
  // --- API Key/JWT Authentication ---
  const apiKey = req.headers.get('x-api-key')
  const authHeader = req.headers.get('authorization')

  // If API key auth is configured, check x-api-key header
  if (process.env.API_KEY) {
    if (apiKey) {
      if (!verifyApiKey(apiKey, process.env.API_KEY)) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid API key' },
          { status: 401 }
        )
      }
      // Valid API key, proceed
    } else if (!authHeader) {
      // No API key and no auth header when API key auth is configured
      return NextResponse.json(
        { error: 'Unauthorized: API key required' },
        { status: 401 }
      )
    }
  }

  // If JWT auth is configured, verify Authorization header
  if (process.env.JWT_SECRET) {
    const token = extractBearerToken(authHeader)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token required' },
        { status: 401 }
      )
    }

    const authResult = await verifyJWT(token, process.env.JWT_SECRET)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: `Unauthorized: ${authResult.error || 'Invalid token'}` },
        { status: 401 }
      )
    }
  }

  // If we reach here, authentication was successful

  // --- Rate Limiting ---
  const clientKey = getClientKey(req);
  const isLimited = await isRateLimited(clientKey);
  if (isLimited) {
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

    // Validate required environment variables at startup
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required")
    }

    // At least one auth method must be configured
    if (!process.env.API_KEY && !process.env.JWT_SECRET) {
      throw new Error("Either API_KEY or JWT_SECRET environment variable must be configured for authentication")
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

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