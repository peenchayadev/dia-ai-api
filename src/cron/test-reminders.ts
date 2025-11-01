/**
 * ไฟล์สำหรับทดสอบการส่งแจ้งเตือนทั้งหมด
 * รันด้วยคำสั่ง: bun run src/cron/test-reminders.ts
 */

import { sendThreeDayReminders, sendSameDayReminders } from '../modules/appointment/appointment-notification.service'
import { sendDailyGlucoseReminders } from '../modules/glucose/glucose-reminder.service'

async function testReminders() {
	console.log('🧪 Testing all reminders...\n')

	// ทดสอบแจ้งเตือนล่วงหน้า 3 วัน
	console.log('1️⃣ Testing 3-day appointment reminders...')
	await sendThreeDayReminders()
	console.log('')

	// ทดสอบแจ้งเตือนวันนัดหมาย
	console.log('2️⃣ Testing same-day appointment reminders...')
	await sendSameDayReminders()
	console.log('')

	// ทดสอบแจ้งเตือนบันทึกค่าน้ำตาล
	console.log('3️⃣ Testing daily glucose reminders...')
	await sendDailyGlucoseReminders()
	console.log('')

	console.log('✅ All tests completed!')
	process.exit(0)
}

testReminders().catch((error) => {
	console.error('❌ Test failed:', error)
	process.exit(1)
})
