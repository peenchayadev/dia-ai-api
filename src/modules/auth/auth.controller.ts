import Elysia, { t } from "elysia"
import { generateJWT, verifyLineToken, verifyLineUser, getTokenExpiryInfo } from "./auth.service"

export const authRouter = new Elysia({ prefix: '/auth' })
  .post('/line-verify', 
    async ({ body, set }) => {
      try {
        const { lineUserId, displayName, pictureUrl } = body
        
        if (!lineUserId || !displayName) {
          console.error('❌ Missing required LINE user data')
          set.status = 400
          return { 
            success: false,
            error: 'LINE user ID and display name are required' 
          }
        }
        
        console.log(`🔍 Verifying LINE user: ${lineUserId}`)
        const lineUser = await verifyLineUser(lineUserId, displayName, pictureUrl)

        if (!lineUser) {
          console.error('❌ LINE user verification failed')
          set.status = 401
          return { 
            success: false,
            error: 'LINE user verification failed. Please try again.' 
          }
        }

        const jwt = await generateJWT(lineUser.userId, lineUser.displayName)

        return {
          success: true,
          data: {
            jwt,
            user: {
              lineUserId: lineUser.userId,
              displayName: lineUser.displayName,
              pictureUrl: lineUser.pictureUrl
            }
          }
        }
      } catch (error) {
        console.error('LINE user verification error:', error)
        set.status = 500
        return { 
          success: false,
          error: 'Internal server error. Please try again.' 
        }
      }
    },
    {
      body: t.Object({
        lineUserId: t.String(),
        displayName: t.String(),
        pictureUrl: t.Optional(t.String())
      })
    }
  )
  .post('/refresh-token',
    async ({ body, set }) => {
      try {
        const { lineIdToken } = body
        
        // Verify the LINE ID token is still valid
        const lineUser = await verifyLineToken(lineIdToken)
        
        if (!lineUser) {
          set.status = 401
          return {
            success: false,
            error: 'LINE token expired. Please login again.'
          }
        }
        
        // Generate new JWT
        const newJwt = await generateJWT(lineUser.userId, lineUser.displayName)
        
        return {
          success: true,
          data: {
            jwt: newJwt,
            user: {
              lineUserId: lineUser.userId,
              displayName: lineUser.displayName,
              pictureUrl: lineUser.pictureUrl
            }
          }
        }
      } catch (error) {
        console.error('Token refresh error:', error)
        set.status = 500
        return {
          success: false,
          error: 'Failed to refresh token'
        }
      }
    },
    {
      body: t.Object({
        lineIdToken: t.String()
      })
    }
  )
  .post('/check-token',
    async ({ body, set }) => {
      try {
        const { lineIdToken } = body
        
        const tokenInfo = getTokenExpiryInfo(lineIdToken)
        
        if (!tokenInfo) {
          set.status = 400
          return {
            success: false,
            error: 'Invalid token format'
          }
        }
        
        return {
          success: true,
          data: {
            isExpired: tokenInfo.isExpired,
            timeUntilExpiry: tokenInfo.timeUntilExpiry,
            expiresAt: tokenInfo.expiresAt,
            needsRefresh: tokenInfo.timeUntilExpiry < 300 // Less than 5 minutes
          }
        }
      } catch (error) {
        console.error('Token check error:', error)
        set.status = 500
        return {
          success: false,
          error: 'Failed to check token'
        }
      }
    },
    {
      body: t.Object({
        lineIdToken: t.String()
      })
    }
  )
