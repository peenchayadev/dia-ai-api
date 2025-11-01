import jwt from 'jsonwebtoken'
import { prisma } from '../../prisma/client'

interface LineUserProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

export async function verifyLineUser(lineUserId: string, displayName: string, pictureUrl?: string): Promise<LineUserProfile | null> {
  try {
    console.log(`🔍 Verifying LINE user: ${lineUserId}`)
    
    if (!lineUserId || !displayName) {
      console.error('❌ Missing required LINE user data')
      return null
    }

    // Create or update user in database
    const dbUser = await prisma.user.upsert({
      where: { lineUserId: lineUserId },
      create: { lineUserId: lineUserId },
      update: {}
    })

    const lineUser: LineUserProfile = {
      userId: lineUserId,
      displayName: displayName,
      pictureUrl: pictureUrl
    }

    console.log(`✅ LINE user verified: ${lineUserId}`)
    return lineUser

  } catch (error) {
    console.error('Error verifying LINE user:', error)
    return null
  }
}

// Keep the old function for backward compatibility but mark as deprecated
export async function verifyLineToken(idToken: string): Promise<LineUserProfile | null> {
  console.warn('⚠️  verifyLineToken is deprecated, use verifyLineUser instead')
  
  try {
    const decoded = jwt.decode(idToken) as any
    if (!decoded || !decoded.sub || !decoded.name) {
      return null
    }

    return await verifyLineUser(decoded.sub, decoded.name, decoded.picture)
  } catch (error) {
    console.error('Error in deprecated verifyLineToken:', error)
    return null
  }
}

export async function generateJWT(lineUserId: string, displayName: string): Promise<string> {
  const payload = {
    lineUserId,
    displayName,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  }

  const secret = process.env.APP_JWT_SECRET || 'your-secret-key'
  
  return jwt.sign(payload, secret)
}

export async function verifyJWT(token: string): Promise<any> {
  try {
    const secret = process.env.APP_JWT_SECRET || 'your-secret-key'
    const decoded = jwt.verify(token, secret) as any
    
    if (!decoded.lineUserId) {
      console.error('Invalid JWT: missing lineUserId')
      return null
    }
    return decoded

  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      console.error('JWT token is expired')
    } else if (error.name === 'JsonWebTokenError') {
      console.error('Invalid JWT token')
    } else {
      console.error('JWT verification error:', error.message)
    }
    return null
  }
}

export function getTokenExpiryInfo(idToken: string): { isExpired: boolean, timeUntilExpiry: number, expiresAt: Date } | null {
  try {
    const decoded = jwt.decode(idToken) as any
    if (!decoded || !decoded.exp) {
      return null
    }

    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = decoded.exp - now
    const isExpired = timeUntilExpiry <= 0

    return {
      isExpired,
      timeUntilExpiry,
      expiresAt: new Date(decoded.exp * 1000)
    }
  } catch (error) {
    console.error('Error getting token expiry info:', error)
    return null
  }
}
