import { PrismaClient } from '@prisma/client'
import dayjs from 'dayjs'

const prisma = new PrismaClient()

export interface ILabResult {
  id: string
  type: string
  value: number
  unit: string
  referenceRange: string | null
  testDate: string
  note: string | null
  media: {
    id: number
    url: string
  }[]
  status: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL'
}

export interface ILabChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    borderColor: string
    backgroundColor: string
    tension: number
  }[]
  referenceRange?: {
    min: number
    max: number
  }
}

export async function getLabResults(
  lineUserId: string,
  page: number = 1,
  limit: number = 10,
  type?: string
): Promise<{
  items: ILabResult[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  types: string[]
}> {
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  let whereClause: any = { userId: user.id }
  if (type) {
    whereClause.type = type
  }

  const [labResults, total, allTypes] = await Promise.all([
    prisma.labResult.findMany({
      where: whereClause,
      include: {
        media: {
          select: {
            id: true,
            url: true
          }
        }
      },
      orderBy: {
        testDate: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.labResult.count({
      where: whereClause
    }),
    prisma.labResult.findMany({
      where: { userId: user.id },
      select: { type: true },
      distinct: ['type']
    })
  ])

  const items: ILabResult[] = labResults.map(result => ({
    id: result.id,
    type: result.type,
    value: result.value,
    unit: result.unit,
    referenceRange: result.referenceRange,
    testDate: result.testDate.toISOString(),
    note: result.note,
    media: result.media,
    status: getLabStatus(result.type, result.value, result.referenceRange)
  }))

  const types = allTypes.map(t => t.type)

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    types
  }
}

export async function getLabResultById(
  resultId: string,
  lineUserId: string
): Promise<ILabResult> {
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  const labResult = await prisma.labResult.findFirst({
    where: {
      id: resultId,
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

  if (!labResult) {
    throw new Error('Lab result not found')
  }

  return {
    id: labResult.id,
    type: labResult.type,
    value: labResult.value,
    unit: labResult.unit,
    referenceRange: labResult.referenceRange,
    testDate: labResult.testDate.toISOString(),
    note: labResult.note,
    media: labResult.media,
    status: getLabStatus(labResult.type, labResult.value, labResult.referenceRange)
  }
}

export async function getLabChartData(
  lineUserId: string,
  labType: string,
  monthsPeriod: number = 6
): Promise<ILabChartData> {
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Query all lab results (no date limit) to ensure we get historical data
  const startDate = dayjs().subtract(10, 'year').toDate() // Go back 10 years
  const endDate = dayjs().toDate() // Until now

  console.log(`🔍 Querying lab results for type: "${labType}", user: ${user.id}`)
  console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)

  const labResults = await prisma.labResult.findMany({
    where: {
      userId: user.id,
      type: {
        equals: labType,
        mode: 'insensitive'
      },
      testDate: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      testDate: 'asc'
    }
  })

  console.log(`📊 Found ${labResults.length} lab results for ${labType}`)
  
  if (labResults.length > 0) {
    console.log(`Sample result:`, {
      type: labResults[0].type,
      value: labResults[0].value,
      testDate: labResults[0].testDate
    })
  }

  const labels = labResults.map(result => 
    dayjs(result.testDate).format('DD/MM/YYYY')
  )
  
  const data = labResults.map(result => result.value)

  // Get reference range for the chart
  const referenceRange = getReferenceRange(labType, labResults[0]?.referenceRange)

  const chartData: ILabChartData = {
    labels,
    datasets: [{
      label: `${labType} (${labResults[0]?.unit || ''})`,
      data,
      borderColor: getChartColor(labType),
      backgroundColor: getChartColor(labType, 0.1),
      tension: 0.4
    }]
  }

  if (referenceRange) {
    chartData.referenceRange = referenceRange
  }

  return chartData
}

export async function deleteLabResult(
  resultId: string,
  lineUserId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { lineUserId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  const labResult = await prisma.labResult.findFirst({
    where: {
      id: resultId,
      userId: user.id
    }
  })

  if (!labResult) {
    throw new Error('Lab result not found')
  }

  // Delete associated media first
  await prisma.media.deleteMany({
    where: {
      labResultId: resultId
    }
  })

  // Delete lab result
  await prisma.labResult.delete({
    where: {
      id: resultId
    }
  })
}

function getLabStatus(
  type: string, 
  value: number, 
  referenceRange: string | null
): 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' {
  if (!referenceRange) return 'NORMAL'

  // Parse reference range (e.g., "4.0-5.6", "70-99")
  const rangeMatch = referenceRange.match(/(\d+\.?\d*)-(\d+\.?\d*)/)
  if (!rangeMatch) return 'NORMAL'

  const min = parseFloat(rangeMatch[1])
  const max = parseFloat(rangeMatch[2])

  if (value < min) {
    // Check for critical low values
    if (type.toLowerCase().includes('glucose') && value < 50) return 'CRITICAL'
    if (type.toLowerCase().includes('hba1c') && value < 3.0) return 'CRITICAL'
    return 'LOW'
  }
  
  if (value > max) {
    // Check for critical high values
    if (type.toLowerCase().includes('glucose') && value > 400) return 'CRITICAL'
    if (type.toLowerCase().includes('hba1c') && value > 10.0) return 'CRITICAL'
    return 'HIGH'
  }

  return 'NORMAL'
}

function getReferenceRange(
  type: string, 
  referenceRange: string | null
): { min: number; max: number } | null {
  if (!referenceRange) return null

  const rangeMatch = referenceRange.match(/(\d+\.?\d*)-(\d+\.?\d*)/)
  if (!rangeMatch) return null

  return {
    min: parseFloat(rangeMatch[1]),
    max: parseFloat(rangeMatch[2])
  }
}

function getChartColor(type: string, alpha: number = 1): string {
  const colors: { [key: string]: string } = {
    'hba1c': `rgba(239, 68, 68, ${alpha})`, // red
    'glucose': `rgba(59, 130, 246, ${alpha})`, // blue
    'cholesterol': `rgba(16, 185, 129, ${alpha})`, // green
    'triglycerides': `rgba(245, 158, 11, ${alpha})`, // yellow
    'hdl': `rgba(139, 92, 246, ${alpha})`, // purple
    'ldl': `rgba(236, 72, 153, ${alpha})` // pink
  }

  const lowerType = type.toLowerCase()
  for (const [key, color] of Object.entries(colors)) {
    if (lowerType.includes(key)) {
      return color
    }
  }

  return `rgba(107, 114, 128, ${alpha})` // default gray
}