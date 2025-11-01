/**
 * ไฟล์สำหรับทดสอบการส่งแจ้งเตือนบันทึกค่าน้ำตาล
 * รันด้วยคำสั่ง: bun run src/cron/test-glucose-reminder.ts
 */

import { sendDailyGlucoseReminders } from '../modules/glucose/glucose-reminder.service'

async function testGlucoseReminder() {
	console.log('🧪 Testing glucose reminder...\n')

	await sendDailyGlucoseReminders()

	console.log('\n✅ Test completed!')
	process.exit(0)
}

testGlucoseReminder().catch((error) => {
	console.error('❌ Test failed:', error)
	process.exit(1)
})
