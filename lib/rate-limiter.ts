import { Redis } from '@upstash/redis'
import { env } from './env'

export class RateLimiter {
  private static instance: RateLimiter
  private redis: Redis

  private constructor() {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Redis configuration missing: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required')
    }
    this.redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter()
    }
    return RateLimiter.instance
  }

  /**
   * Check if a client has exceeded their rate limit using a sliding window
   * @param clientKey Unique identifier for the client (e.g., IP address)
   * @param windowMs Time window in milliseconds
   * @param maxRequests Maximum number of requests allowed in the window
   * @returns true if rate limited, false otherwise
   */
  async isRateLimited(
    clientKey: string,
    windowMs: number = 60 * 1000, // 1 minute default
    maxRequests: number = 10 // 10 requests per window default
  ): Promise<boolean> {
    const now = Date.now()
    const windowKey = `ratelimit:${clientKey}`
    
    // Remove requests older than the window and add the current request
    const pipeline = this.redis
      .pipeline()
      .zremrangebyscore(windowKey, 0, now - windowMs) // Remove old entries
      .zadd(windowKey, { score: now, member: now.toString() }) // Add current request
      .zcard(windowKey) // Get number of requests in window
      .expire(windowKey, Math.ceil(windowMs / 1000)) // Set TTL in seconds
    
    const [, , requestCount] = await pipeline.exec()

    return (requestCount as number) > maxRequests
  }
}
