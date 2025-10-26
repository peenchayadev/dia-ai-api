import dayjs from 'dayjs'
import { prisma } from '../../prisma/client'
import type { MealPeriod } from '@prisma/client'

export enum GlucoseLevel {
  LOW = 'LOW',
  NORMAL = 'NORMAL', 
  HIGH = 'HIGH'
}

export interface GlucoseSummary {
  measurementCount: number
  latestLevel: {
    value: number
    status: GlucoseLevel
    recordedAt: Date
  } | null
  average: number | null
  minimum: number | null
  maximum: number | null
  date: string
}

export interface GlucoseReading {
  id: string
  value: number
  status: GlucoseLevel
  recordedAt: Date
  period: MealPeriod
  note?: string | null
}

function getGlucoseStatus(value: number, targetMin: number = 80, targetMax: number = 180): GlucoseLevel {
  if (value <= targetMin) {
    return GlucoseLevel.LOW
  } else if (value >= targetMax) {
    return GlucoseLevel.HIGH
  } else {
    return GlucoseLevel.NORMAL
  }
}

export async function getTodayGlucoseSummary(lineUserId: string): Promise<GlucoseSummary> {
  // Get user from database
  const user = await prisma.user.findUnique({
    where: { lineUserId },
    include: {
      settings: true
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Get today's date range (00:00 - 23:59)
  const today = dayjs()
  const startOfDay = today.startOf('day').toDate()
  const endOfDay = today.endOf('day').toDate()

  // Get all glucose logs for today
  const todayLogs = await prisma.glucoseLog.findMany({
    where: {
      userId: user.id,
      recordedAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: {
      recordedAt: 'desc'
    }
  })

  // Calculate summary
  const measurementCount = todayLogs.length
  
  let latestLevel = null
  let average = null
  let minimum = null
  let maximum = null

  if (todayLogs.length > 0) {
    // Latest measurement
    const latest = todayLogs[0]
    const targetMin = user.settings?.targetMin || 80
    const targetMax = user.settings?.targetMax || 180
    
    latestLevel = {
      value: latest?.value || 0,
      status: getGlucoseStatus(latest?.value || 0, targetMin, targetMax),
      recordedAt: latest?.recordedAt || new Date()
    }

    // Calculate statistics
    const values = todayLogs.map(log => log.value)
    average = Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
    minimum = Math.min(...values)
    maximum = Math.max(...values)
  }

  return {
    measurementCount,
    latestLevel,
    average,
    minimum,
    maximum,
    date: today.format('YYYY-MM-DD')
  }
}

export async function getTodayGlucoseReadings(lineUserId: string): Promise<GlucoseReading[]> {
  // Get user from database
  const user = await prisma.user.findUnique({
    where: { lineUserId },
    include: {
      settings: true
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Get today's date range (00:00 - 23:59)
  const today = dayjs()
  const startOfDay = today.startOf('day').toDate()
  const endOfDay = today.endOf('day').toDate()

  // Get all glucose logs for today
  const todayLogs = await prisma.glucoseLog.findMany({
    where: {
      userId: user.id,
      recordedAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: {
      recordedAt: 'desc'
    }
  })

  // Get user's glucose target range
  const targetMin = user.settings?.targetMin || 80
  const targetMax = user.settings?.targetMax || 180

  // Format the readings
  const readings: GlucoseReading[] = todayLogs.map(log => ({
    id: log.id,
    value: log.value,
    status: getGlucoseStatus(log.value, targetMin, targetMax),
    recordedAt: log.recordedAt,
    period: log.period,
    note: log.note
  }))

  return readings
}

export async function updateGlucoseLog(
  glucoseId: string, 
  lineUserId: string, 
  updateData: { value?: number; period?: MealPeriod; note?: string }
) {
  // Get user from database
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Check if the glucose log exists and belongs to the user
  const existingLog = await prisma.glucoseLog.findFirst({
    where: {
      id: glucoseId,
      userId: user.id
    }
  })

  if (!existingLog) {
    throw new Error('Glucose log not found or access denied')
  }

  // Update the glucose log
  const updatedLog = await prisma.glucoseLog.update({
    where: { id: glucoseId },
    data: {
      ...(updateData.value && { value: updateData.value }),
      ...(updateData.period && { period: updateData.period }),
      ...(updateData.note !== undefined && { note: updateData.note })
    }
  })

  // Get user's glucose target range for status calculation
  const userSettings = await prisma.userSetting.findUnique({
    where: { userId: user.id }
  })
  
  const targetMin = userSettings?.targetMin || 80
  const targetMax = userSettings?.targetMax || 180

  return {
    id: updatedLog.id,
    value: updatedLog.value,
    status: getGlucoseStatus(updatedLog.value, targetMin, targetMax),
    recordedAt: updatedLog.recordedAt,
    period: updatedLog.period,
    note: updatedLog.note
  }
}

export async function deleteGlucoseLog(glucoseId: string, lineUserId: string) {
  // Get user from database
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Check if the glucose log exists and belongs to the user
  const existingLog = await prisma.glucoseLog.findFirst({
    where: {
      id: glucoseId,
      userId: user.id
    }
  })

  if (!existingLog) {
    throw new Error('Glucose log not found or access denied')
  }

  // Delete the glucose log
  await prisma.glucoseLog.delete({
    where: { id: glucoseId }
  })

  return { success: true }
}
