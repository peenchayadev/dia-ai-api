import Elysia, { t } from "elysia"
import { verifyJWT } from "../auth/auth.service"
import { getBearerToken } from "../../utils/getBearerToken"
import { getTodayGlucoseSummary, getTodayGlucoseReadings, updateGlucoseLog, deleteGlucoseLog, getGlucoseHistory } from "./glucose.service"

export const glucoseRouter = new Elysia({ prefix: '/glucose' })
  .get('/summary/today', 
    async ({ headers, set }) => {
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

        // Get today's glucose summary
        const summary = await getTodayGlucoseSummary(lineUserId)

        return {
          success: true,
          data: summary
        }
      } catch (error) {
        console.error('Error getting glucose summary:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )
  .get('/today',
    async ({ headers, set }) => {
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

        // Get today's glucose readings
        const readings = await getTodayGlucoseReadings(lineUserId)

        return {
          success: true,
          data: readings
        }
      } catch (error) {
        console.error('Error getting glucose readings:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )
  .put('/:id', 
    async ({ params, body, headers, set }) => {
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
        const glucoseId = params.id
        const updateData = body as any

        // Update glucose log
        const updatedLog = await updateGlucoseLog(glucoseId, lineUserId, updateData)

        return {
          success: true,
          data: updatedLog
        }
      } catch (error: any) {
        console.error('Error updating glucose log:', error)
        if (error.message === 'Glucose log not found or access denied') {
          set.status = 404
          return { error: 'Glucose log not found or access denied' }
        }
        set.status = 500
        return { error: 'Internal server error' }
      }
    },
    {
      body: t.Object({
        value: t.Optional(t.Number()),
        period: t.Optional(t.String()),
        note: t.Optional(t.String())
      })
    }
  )
  .delete('/:id',
    async ({ params, headers, set }) => {
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
        const glucoseId = params.id

        // Delete glucose log
        await deleteGlucoseLog(glucoseId, lineUserId)

        return {
          success: true,
          message: 'Glucose log deleted successfully'
        }
      } catch (error: any) {
        console.error('Error deleting glucose log:', error)
        if (error.message === 'Glucose log not found or access denied') {
          set.status = 404
          return { error: 'Glucose log not found or access denied' }
        }
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )
  .get('/history',
    async ({ query, headers, set }) => {
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
        const { period = '30', type = 'daily' } = query as { period?: string; type?: string }

        // Get glucose history
        const history = await getGlucoseHistory(lineUserId, parseInt(period), type as 'daily' | 'weekly' | 'monthly')

        return {
          success: true,
          data: history
        }
      } catch (error) {
        console.error('Error getting glucose history:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )
