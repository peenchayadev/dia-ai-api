import { Elysia } from 'elysia'
import { FoodService } from './food.service'
import { verifyJWT } from '../auth/auth.service'
import { getBearerToken } from '../../utils/getBearerToken'

const foodService = new FoodService()

export const foodRouter = new Elysia({ prefix: '/food' })
  .get('/', async ({ headers, set }) => {
    try {
      // Get and verify JWT token
      const token = getBearerToken(headers.authorization)
      if (!token) {
        set.status = 401
        return { error: 'Authorization token required' }
      }

      const decoded = await verifyJWT(token)
      if (!decoded) {
        set.status = 401
        return { error: 'Invalid or expired token' }
      }

      const lineUserId = decoded.lineUserId

      // Get user food analyses
      const result = await foodService.getFoodAnalyses(lineUserId)
      return result
    } catch (error) {
      console.error('Error getting food analyses:', error)
      set.status = 500
      return { error: 'Internal server error' }
    }
  }, {
    detail: {
      tags: ['Food'],
      summary: 'Get user food analyses',
      security: [{ bearerAuth: [] }]
    }
  })
  .get('/summary', async ({ headers, set }) => {
    try {
      // Get and verify JWT token
      const token = getBearerToken(headers.authorization)
      if (!token) {
        set.status = 401
        return { error: 'Authorization token required' }
      }

      const decoded = await verifyJWT(token)
      if (!decoded) {
        set.status = 401
        return { error: 'Invalid or expired token' }
      }

      const lineUserId = decoded.lineUserId

      // Get food summary
      const result = await foodService.getFoodSummary(lineUserId)
      return result
    } catch (error) {
      console.error('Error getting food summary:', error)
      set.status = 500
      return { error: 'Internal server error' }
    }
  }, {
    detail: {
      tags: ['Food'],
      summary: 'Get food analysis summary',
      security: [{ bearerAuth: [] }]
    }
  })