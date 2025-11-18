
export function toHumanTiming (timing: string) :string {
  switch (timing) {
    case 'MORNING_BEFORE':
      return 'ก่อนอาหารเช้า'
    case 'MORNING_AFTER':
      return 'หลังอาหารเช้า'
    case 'LUNCH_BEFORE':
      return 'ก่อนอาหารกลางวัน'
    case 'LUNCH_AFTER':
      return 'หลังอาหารกลางวัน'
    case 'DINNER_BEFORE':
      return 'ก่อนอาหารเย็น'
    case 'DINNER_AFTER':
      return 'หลังอาหารเย็น'
    case 'BEDTIME':
      return 'ก่อนนอน'
    default:
      return timing
  }
}

export function toNum  (v: unknown): number | null  {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

export function getGlucoseStatus(value: number, timing: string): { status: string, color: string, emoji: string } {
  const isBeforeMeal = timing.includes('BEFORE') || timing === 'FASTING'
  
  // ต่ำกว่า 70 = ต่ำ
  if (value < 70) {
    return { status: 'ต่ำ', color: '#FF6B6B', emoji: '⚠️' }
  }
  
  if (isBeforeMeal) {
    // ก่อนอาหาร: 80-130 = ปกติ, > 130 = สูง
    if (value > 130) {
      return { status: 'สูง', color: '#FF6B6B', emoji: '⚠️' }
    } else if (value >= 80 && value <= 130) {
      return { status: 'ปกติ', color: '#1DB446', emoji: '✅' }
    } else {
      // 70-79 = ค่อนข้างต่ำ
      return { status: 'ค่อนข้างต่ำ', color: '#FFA726', emoji: '⚡' }
    }
  } else {
    // หลังอาหาร: < 180 = ปกติ, >= 180 = สูง
    if (value >= 180) {
      return { status: 'สูง', color: '#FF6B6B', emoji: '⚠️' }
    } else {
      return { status: 'ปกติ', color: '#1DB446', emoji: '✅' }
    }
  }
}
