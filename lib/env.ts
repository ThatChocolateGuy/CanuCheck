import { z } from 'zod'

const envSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  // Keep existing env vars
  OPENAI_API_KEY: z.string().min(1),
  API_KEY: z.string().optional(),
})

export const env = envSchema.parse(process.env)
