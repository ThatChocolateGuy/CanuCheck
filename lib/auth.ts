import * as jose from 'jose'

export interface AuthResult {
  authenticated: boolean
  error?: string
}

/**
 * Verify API key using constant-time comparison
 */
export function verifyApiKey(apiKey: string | null, configuredKey: string): boolean {
  if (!apiKey) return false
  
  // Constant-time string comparison to prevent timing attacks
  if (apiKey.length !== configuredKey.length) return false
  let result = 0
  for (let i = 0; i < apiKey.length; i++) {
    result |= apiKey.charCodeAt(i) ^ configuredKey.charCodeAt(i)
  }
  return result === 0
}

/**
 * Verify JWT token
 */
export async function verifyJWT(token: string, secret: string): Promise<AuthResult> {
  try {
    // Convert secret to Uint8Array for jose
    const secretKey = new TextEncoder().encode(secret)
    
    // Verify the token
    await jose.jwtVerify(token, secretKey, {
      algorithms: ['HS256'], // Only allow HMAC SHA-256
      clockTolerance: 30, // 30 seconds clock skew tolerance
    })
    
    return { authenticated: true }
  } catch (error) {
    return { 
      authenticated: false, 
      error: error instanceof Error ? error.message : 'Invalid token'
    }
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.substring(7) // Remove 'Bearer ' prefix
}
