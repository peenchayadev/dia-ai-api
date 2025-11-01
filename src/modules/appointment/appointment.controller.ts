import Elysia, { t } from "elysia"
import { verifyJWT } from "../auth/auth.service"
import { getBearerToken } from "../../utils/getBearerToken"
import {
  getUserAppointments,
  getAppointmentById,
  getAppointmentSummary,
  deleteAppointment
} from "./appointment.service"

export const appointmentRouter = new Elysia({ prefix: '/appointments' })
  .get('/',
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

        // Get user appointments
        const appointments = await getUserAppointments(lineUserId)

        return {
          success: true,
          data: appointments
        }
      } catch (error) {
        console.error('Error getting appointments:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )
  .get('/summary',
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

        // Get appointment summary
        const summary = await getAppointmentSummary(lineUserId)

        return {
          success: true,
          data: summary
        }
      } catch (error) {
        console.error('Error getting appointment summary:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )
  .get('/:id',
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
        const appointmentId = parseInt(params.id)

        if (isNaN(appointmentId)) {
          set.status = 400
          return { error: 'Invalid appointment ID' }
        }

        // Get specific appointment
        const appointment = await getAppointmentById(appointmentId, lineUserId)

        if (!appointment) {
          set.status = 404
          return { error: 'Appointment not found' }
        }

        return {
          success: true,
          data: appointment
        }
      } catch (error) {
        console.error('Error getting appointment:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
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
        const appointmentId = parseInt(params.id)

        if (isNaN(appointmentId)) {
          set.status = 400
          return { error: 'Invalid appointment ID' }
        }

        // Delete appointment
        await deleteAppointment(appointmentId, lineUserId)

        return {
          success: true,
          message: 'Appointment deleted successfully'
        }
      } catch (error: any) {
        console.error('Error deleting appointment:', error)
        if (error.message === 'Appointment not found or access denied') {
          set.status = 404
          return { error: 'Appointment not found or access denied' }
        }
        set.status = 500
        return { error: 'Internal server error' }
      }
    }
  )