import { PrismaClient } from '@prisma/client'
import dayjs from 'dayjs'

const prisma = new PrismaClient()

export interface IGlucoseChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    borderColor: string
    backgroundColor: string
    tension: number
  }[]
  summary: {
    average: number
    min: number
    max: number
    count: number
  }
}

export interface IGlucoseHistoryItem {
  id: string
  value: number
  period: string
  note: string | null
  recordedAt: string
  status: 'LOW' | 'NORMAL' | 'HIGH'
}

export interface IHealthSummary {
  totalRecords: number
  averageGlucose: number
  lastRecordDate: string | null
  weeklyAverage: number
  monthlyAverage: number
  trends: {
    thisWeek: number
    lastWeek: number
    thisMonth: number
    lastMonth: number
  }
}

export async function getGlucoseChartData(
  lineUserId: string, 
  period: 'today' | 'yesterday' | 'week' | 'month'
): Promise<IGlucoseChartData> {
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  let startDate: Date
  let endDate: Date
  let groupBy: 'hour' | 'day' = 'hour'

  const now = dayjs()

  switch (period) {
    case 'today':
      startDate = now.startOf('day').toDate()
      endDate = now.endOf('day').toDate()
      groupBy = 'hour'
      break
    case 'yesterday':
      startDate = now.subtract(1, 'day').startOf('day').toDate()
      endDate = now.subtract(1, 'day').endOf('day').toDate()
      groupBy = 'hour'
      break
    case 'week':
      startDate = now.startOf('week').toDate()
      endDate = now.endOf('week').toDate()
      groupBy = 'day'
      break
    case 'month':
      startDate = now.startOf('month').toDate()
      endDate = now.endOf('month').toDate()
      groupBy = 'day'
      break
  }

  const glucoseLogs = await prisma.glucoseLog.findMany({
    where: {
      userId: user.id,
      recordedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      recordedAt: 'asc'
    }
  })

  // Group data by actual recorded time/day
  const groupedData = new Map<string, { values: number[], timestamp: Date }>()
  
  glucoseLogs.forEach(log => {
    let key: string
    
    if (groupBy === 'hour') {
      // For today/yesterday: show each measurement time
      key = dayjs(log.recordedAt).format('HH:mm')
    } else {
      // For week/month: group by day and calculate average per day
      key = dayjs(log.recordedAt).format('DD/MM')
    }
    
    if (!groupedData.has(key)) {
      groupedData.set(key, { values: [], timestamp: log.recordedAt })
    }
    groupedData.get(key)!.values.push(log.value)
  })

  // Calculate averages - only for times/days that have data
  // For today/yesterday: each time point shows actual measurement
  // For week/month: each day shows average of all measurements that day
  const labels: string[] = []
  const data: number[] = []

  // Sort by timestamp to maintain chronological order
  const sortedEntries = Array.from(groupedData.entries()).sort((a, b) => {
    return a[1].timestamp.getTime() - b[1].timestamp.getTime()
  })

  sortedEntries.forEach(([key, entry]) => {
    // Calculate average for this time/day
    const average = entry.values.reduce((sum, val) => sum + val, 0) / entry.values.length
    
    labels.push(key)
    data.push(Math.round(average))
    
    // Log for debugging (only for week/month to see daily averages)
    if (groupBy === 'day' && entry.values.length > 1) {
      console.log(`${key}: ${entry.values.length} measurements, average: ${Math.round(average)} mg/dL`)
    }
  })

  // Calculate summary
  const allValues = glucoseLogs.map(log => log.value)
  const summary = {
    average: allValues.length > 0 ? Math.round(allValues.reduce((sum, val) => sum + val, 0) / allValues.length) : 0,
    min: allValues.length > 0 ? Math.min(...allValues) : 0,
    max: allValues.length > 0 ? Math.max(...allValues) : 0,
    count: allValues.length
  }

  return {
    labels,
    datasets: [{
      label: 'ระดับน้ำตาลในเลือด (mg/dL)',
      data,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    }],
    summary
  }
}

export async function getGlucoseHistoryList(
  lineUserId: string,
  page: number = 1,
  limit: number = 20,
  period?: 'today' | 'yesterday' | 'week' | 'month'
): Promise<{
  items: IGlucoseHistoryItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}> {
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  let whereClause: any = { userId: user.id }

  if (period) {
    const now = dayjs()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'today':
        startDate = now.startOf('day').toDate()
        endDate = now.endOf('day').toDate()
        break
      case 'yesterday':
        startDate = now.subtract(1, 'day').startOf('day').toDate()
        endDate = now.subtract(1, 'day').endOf('day').toDate()
        break
      case 'week':
        startDate = now.startOf('week').toDate()
        endDate = now.endOf('week').toDate()
        break
      case 'month':
        startDate = now.startOf('month').toDate()
        endDate = now.endOf('month').toDate()
        break
    }

    whereClause.recordedAt = {
      gte: startDate,
      lte: endDate
    }
  }

  const [glucoseLogs, total] = await Promise.all([
    prisma.glucoseLog.findMany({
      where: whereClause,
      orderBy: {
        recordedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.glucoseLog.count({
      where: whereClause
    })
  ])

  const items: IGlucoseHistoryItem[] = glucoseLogs.map(log => ({
    id: log.id,
    value: log.value,
    period: log.period,
    note: log.note,
    recordedAt: log.recordedAt.toISOString(),
    status: getGlucoseStatus(log.value)
  }))

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export async function getHealthSummary(lineUserId: string): Promise<IHealthSummary> {
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  const now = dayjs()
  
  // Get all records count
  const totalRecords = await prisma.glucoseLog.count({
    where: { userId: user.id }
  })

  // Get overall average
  const allLogs = await prisma.glucoseLog.findMany({
    where: { userId: user.id },
    select: { value: true, recordedAt: true },
    orderBy: { recordedAt: 'desc' }
  })

  const averageGlucose = allLogs.length > 0 
    ? Math.round(allLogs.reduce((sum, log) => sum + log.value, 0) / allLogs.length)
    : 0

  const lastRecordDate = allLogs.length > 0 ? allLogs[0].recordedAt.toISOString() : null

  // Weekly averages
  const thisWeekLogs = await prisma.glucoseLog.findMany({
    where: {
      userId: user.id,
      recordedAt: {
        gte: now.startOf('week').toDate(),
        lte: now.endOf('week').toDate()
      }
    }
  })

  const lastWeekLogs = await prisma.glucoseLog.findMany({
    where: {
      userId: user.id,
      recordedAt: {
        gte: now.subtract(1, 'week').startOf('week').toDate(),
        lte: now.subtract(1, 'week').endOf('week').toDate()
      }
    }
  })

  // Monthly averages
  const thisMonthLogs = await prisma.glucoseLog.findMany({
    where: {
      userId: user.id,
      recordedAt: {
        gte: now.startOf('month').toDate(),
        lte: now.endOf('month').toDate()
      }
    }
  })

  const lastMonthLogs = await prisma.glucoseLog.findMany({
    where: {
      userId: user.id,
      recordedAt: {
        gte: now.subtract(1, 'month').startOf('month').toDate(),
        lte: now.subtract(1, 'month').endOf('month').toDate()
      }
    }
  })

  const weeklyAverage = thisWeekLogs.length > 0 
    ? Math.round(thisWeekLogs.reduce((sum, log) => sum + log.value, 0) / thisWeekLogs.length)
    : 0

  const monthlyAverage = thisMonthLogs.length > 0 
    ? Math.round(thisMonthLogs.reduce((sum, log) => sum + log.value, 0) / thisMonthLogs.length)
    : 0

  return {
    totalRecords,
    averageGlucose,
    lastRecordDate,
    weeklyAverage,
    monthlyAverage,
    trends: {
      thisWeek: thisWeekLogs.length > 0 
        ? Math.round(thisWeekLogs.reduce((sum, log) => sum + log.value, 0) / thisWeekLogs.length)
        : 0,
      lastWeek: lastWeekLogs.length > 0 
        ? Math.round(lastWeekLogs.reduce((sum, log) => sum + log.value, 0) / lastWeekLogs.length)
        : 0,
      thisMonth: monthlyAverage,
      lastMonth: lastMonthLogs.length > 0 
        ? Math.round(lastMonthLogs.reduce((sum, log) => sum + log.value, 0) / lastMonthLogs.length)
        : 0
    }
  }
}

function getGlucoseStatus(value: number): 'LOW' | 'NORMAL' | 'HIGH' {
  if (value < 70) return 'LOW'
  if (value > 180) return 'HIGH'
  return 'NORMAL'
}