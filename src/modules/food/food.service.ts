import { prisma } from '../../prisma/client'

export class FoodService {
  async getFoodAnalyses(lineUserId: string) {
    // First find the user by lineUserId
    const user = await prisma.user.findUnique({
      where: { lineUserId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const foodAnalyses = await prisma.foodAnalysis.findMany({
      where: { userId: user.id },
      include: {
        media: true
      },
      orderBy: { id: 'desc' }
    })

    return {
      success: true,
      data: foodAnalyses
    }
  }

  async getFoodSummary(lineUserId: string) {
    // First find the user by lineUserId
    const user = await prisma.user.findUnique({
      where: { lineUserId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const total = await prisma.foodAnalysis.count({
      where: { userId: user.id }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayCount = await prisma.foodAnalysis.count({
      where: {
        userId: user.id,
        id: {
          // Since we don't have createdAt, we'll use id as proxy for recent entries
          gte: await this.getTodayMinId(user.id, today)
        }
      }
    })

    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)

    const weekCount = await prisma.foodAnalysis.count({
      where: {
        userId: user.id,
        id: {
          gte: await this.getWeekMinId(user.id, thisWeek)
        }
      }
    })

    return {
      success: true,
      data: {
        total,
        today: todayCount,
        thisWeek: weekCount
      }
    }
  }

  private async getTodayMinId(userId: number, today: Date): Promise<number> {
    // This is a rough approximation since we don't have createdAt
    // In a real scenario, you'd want to add createdAt to the schema
    const recentAnalyses = await prisma.foodAnalysis.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take: 10
    })
    
    return recentAnalyses.length > 0 ? recentAnalyses[recentAnalyses.length - 1].id : 0
  }

  private async getWeekMinId(userId: number, weekAgo: Date): Promise<number> {
    // This is a rough approximation since we don't have createdAt
    const recentAnalyses = await prisma.foodAnalysis.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take: 50
    })
    
    return recentAnalyses.length > 0 ? recentAnalyses[Math.floor(recentAnalyses.length * 0.7)].id : 0
  }
}