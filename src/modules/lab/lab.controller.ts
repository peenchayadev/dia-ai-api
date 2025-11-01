import Elysia, { t } from "elysia"
import { verifyJWT } from "../auth/auth.service"
import { getBearerToken } from "../../utils/getBearerToken"
import { 
  getLabResults, 
  getLabResultById, 
  getLabChartData,
  deleteLabResult 
} from "./lab.service"

export const labRouter = new Elysia({ prefix: '/lab' })
  .get('/results',
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
        const { page = '1', limit = '10', type } = query as { 
          page?: string; 
          limit?: string; 
          type?: string 
        }

        const results = await getLabResults(
          lineUserId, 
          parseInt(page), 
          parseInt(limit),
          type
        )

        return {
          success: true,
          data: results
        }
      } catch (error) {
        console.error('Error getting lab results:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )
  .get('/results/:id',
    async ({ params, headers, set }) => {
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
        const resultId = params.id

        const result = await getLabResultById(resultId, lineUserId)

        return {
          success: true,
          data: result
        }
      } catch (error: any) {
        console.error('Error getting lab result:', error)
        if (error.message === 'Lab result not found') {
          set.status = 404
          return { error: 'Lab result not found' }
        }
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )
  .get('/chart/:type',
    async ({ params, query, headers, set }) => {
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
        const labType = params.type
        const { period = '6' } = query as { period?: string }

        const chartData = await getLabChartData(lineUserId, labType, parseInt(period))

        return {
          success: true,
          data: chartData
        }
      } catch (error) {
        console.error('Error getting lab chart data:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )
  .delete('/results/:id',
    async ({ params, headers, set }) => {
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
        const resultId = params.id

        await deleteLabResult(resultId, lineUserId)

        return {
          success: true,
          message: 'Lab result deleted successfully'
        }
      } catch (error: any) {
        console.error('Error deleting lab result:', error)
        if (error.message === 'Lab result not found') {
          set.status = 404
          return { error: 'Lab result not found' }
        }
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )