# Cron Jobs

## Appointment Reminders

ระบบแจ้งเตือนนัดหมายอัตโนมัติผ่าน LINE

### กำหนดการทำงาน

1. **แจ้งเตือนล่วงหน้า 3 วัน**
   - เวลา: ทุกวัน 09:00 น. (เวลาไทย)
   - Cron: `0 9 * * *`
   - ฟังก์ชัน: `sendThreeDayReminders()`
   - ส่งข้อความแจ้งเตือนให้ผู้ใช้ที่มีนัดหมายในอีก 3 วัน

2. **แจ้งเตือนวันนัดหมาย**
   - เวลา: ทุกวัน 05:00 น. (เวลาไทย)
   - Cron: `0 5 * * *`
   - ฟังก์ชัน: `sendSameDayReminders()`
   - ส่งข้อความแจ้งเตือนให้ผู้ใช้ที่มีนัดหมายในวันนั้น

## Glucose Reminders

ระบบแจ้งเตือนบันทึกค่าน้ำตาลประจำวัน

### กำหนดการทำงาน

3. **แจ้งเตือนบันทึกค่าน้ำตาล**
   - เวลา: ทุกวัน 07:00 น. (เวลาไทย)
   - Cron: `0 7 * * *`
   - ฟังก์ชัน: `sendDailyGlucoseReminders()`
   - ส่งข้อความแจ้งเตือนให้ผู้ใช้ที่ยังไม่ได้บันทึกค่าน้ำตาลในวันนั้น
   - ข้อความแบบสุ่ม 10 แบบ เพื่อไม่ให้น่าเบื่อ

### คุณสมบัติ

- ✅ ส่งข้อความแบบ Flex Message สวยงาม
- ✅ บันทึก log การส่งข้อความใน `NotificationLog`
- ✅ ป้องกันการส่งซ้ำด้วย unique constraint
- ✅ จัดการ error และ retry
- ✅ แสดงข้อมูลนัดหมายครบถ้วน (วันที่, เวลา, โรงพยาบาล, แพทย์, เหตุผล)

### การทดสอบ

สามารถเรียกใช้ฟังก์ชันได้โดยตรง:

```typescript
import { sendThreeDayReminders, sendSameDayReminders } from './modules/appointment/appointment-notification.service'
import { sendDailyGlucoseReminders } from './modules/glucose/glucose-reminder.service'

// ทดสอบแจ้งเตือนล่วงหน้า 3 วัน
await sendThreeDayReminders()

// ทดสอบแจ้งเตือนวันนัดหมาย
await sendSameDayReminders()

// ทดสอบแจ้งเตือนบันทึกค่าน้ำตาล
await sendDailyGlucoseReminders()
```

### Database Schema

ใช้ตาราง `NotificationLog` เพื่อติดตามการส่งข้อความ:

```prisma
model NotificationLog {
  id               Int         @id @default(autoincrement())
  createdAt        DateTime    @default(now())
  userId           Int
  appointmentId    Int
  notificationType String      // "3_DAY_REMINDER" | "SAME_DAY_REMINDER"
  sentAt           DateTime    @default(now())
  success          Boolean     @default(true)
  errorMessage     String?
  retryCount       Int         @default(0)

  @@unique([appointmentId, notificationType])
}
```
