import Elysia, { t } from "elysia"
import { verifyJWT } from "../auth/auth.service"
import { getBearerToken } from "../../utils/getBearerToken"
import { getGlucoseChartData, getGlucoseHistoryList, getHealthSummary } from "./history.service"

export const historyRouter = new Elysia({ prefix: '/history' })
  .get('/glucose/chart',
    async ({ query, headers, set }) => {
      try {
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
        const { period = 'today' } = query as { period?: 'today' | 'yesterday' | 'week' | 'month' }

        const chartData = await getGlucoseChartData(lineUserId, period)

        return {
          success: true,
          data: chartData
        }
      } catch (error) {
        console.error('Error getting glucose chart data:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )
  .get('/glucose/list',
    async ({ query, headers, set }) => {
      try {
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
        const { page = '1', limit = '20', period } = query as { 
          page?: string; 
          limit?: string; 
          period?: 'today' | 'yesterday' | 'week' | 'month' 
        }

        const historyList = await getGlucoseHistoryList(
          lineUserId, 
          parseInt(page), 
          parseInt(limit),
          period
        )

        return {
          success: true,
          data: historyList
        }
      } catch (error) {
        console.error('Error getting glucose history list:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )
  .get('/summary',
    async ({ headers, set }) => {
      try {
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
        const summary = await getHealthSummary(lineUserId)

        return {
          success: true,
          data: summary
        }
      } catch (error) {
        console.error('Error getting health summary:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )