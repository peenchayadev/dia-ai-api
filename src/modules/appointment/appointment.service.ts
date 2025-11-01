import dayjs from 'dayjs'
import { prisma } from '../../prisma/client'

export enum AppointmentStatus {
  UPCOMING = 'UPCOMING',
  TODAY = 'TODAY', 
  PAST = 'PAST'
}

export interface AppointmentWithStatus {
  id: number
  appointmentDate: Date | null
  startTime: string | null
  endTime: string | null
  doctorName: string | null
  hospitalName: string | null
  fullName: string | null
  age: string | null
  reason: string | null
  details: string | null
  createdAt: Date
  status: AppointmentStatus
  media: {
    id: number
    url: string
  }[]
}

export interface AppointmentSummary {
  total: number
  upcoming: number
  today: number
  past: number
}

function getAppointmentStatus(appointmentDate: Date | null): AppointmentStatus {
  if (!appointmentDate) return AppointmentStatus.PAST
  
  const today = dayjs().startOf('day')
  const appointmentDay = dayjs(appointmentDate).startOf('day')
  
  if (appointmentDay.isSame(today)) {
    return AppointmentStatus.TODAY
  } else if (appointmentDay.isAfter(today)) {
    return AppointmentStatus.UPCOMING
  } else {
    return AppointmentStatus.PAST
  }
}

export async function getUserAppointments(lineUserId: string): Promise<AppointmentWithStatus[]> {
  // Get user from database
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Get all appointments for user
  const appointments = await prisma.appointment.findMany({
    where: {
      userId: user.id
    },
    include: {
      media: {
        select: {
          id: true,
          url: true
        }
      }
    },
    orderBy: [
      {
        appointmentDate: 'desc'
      },
      {
        createdAt: 'desc'
      }
    ]
  })

  // Add status to each appointment
  const appointmentsWithStatus: AppointmentWithStatus[] = appointments.map(appointment => ({
    id: appointment.id,
    appointmentDate: appointment.appointmentDate,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    doctorName: appointment.doctorName,
    hospitalName: appointment.hospitalName,
    fullName: appointment.fullName,
    age: appointment.age,
    reason: appointment.reason,
    details: appointment.details,
    createdAt: appointment.createdAt,
    status: getAppointmentStatus(appointment.appointmentDate),
    media: appointment.media
  }))

  return appointmentsWithStatus
}

export async function getAppointmentById(appointmentId: number, lineUserId: string): Promise<AppointmentWithStatus | null> {
  // Get user from database
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Get specific appointment
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      userId: user.id
    },
    include: {
      media: {
        select: {
          id: true,
          url: true
        }
      }
    }
  })

  if (!appointment) {
    return null
  }

  return {
    id: appointment.id,
    appointmentDate: appointment.appointmentDate,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    doctorName: appointment.doctorName,
    hospitalName: appointment.hospitalName,
    fullName: appointment.fullName,
    age: appointment.age,
    reason: appointment.reason,
    details: appointment.details,
    createdAt: appointment.createdAt,
    status: getAppointmentStatus(appointment.appointmentDate),
    media: appointment.media
  }
}

export async function getAppointmentSummary(lineUserId: string): Promise<AppointmentSummary> {
  const appointments = await getUserAppointments(lineUserId)
  
  const summary: AppointmentSummary = {
    total: appointments.length,
    upcoming: 0,
    today: 0,
    past: 0
  }

  appointments.forEach(appointment => {
    switch (appointment.status) {
      case AppointmentStatus.UPCOMING:
        summary.upcoming++
        break
      case AppointmentStatus.TODAY:
        summary.today++
        break
      case AppointmentStatus.PAST:
        summary.past++
        break
    }
  })

  return summary
}

export async function deleteAppointment(appointmentId: number, lineUserId: string): Promise<void> {
  // Get user from database
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Check if appointment exists and belongs to user
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      userId: user.id
    }
  })

  if (!appointment) {
    throw new Error('Appointment not found or access denied')
  }

  // Delete appointment (media will be cascade deleted)
  await prisma.appointment.delete({
    where: { id: appointmentId }
  })
}