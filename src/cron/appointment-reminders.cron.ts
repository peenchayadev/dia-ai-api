import cron from 'node-cron'
import { sendThreeDayReminders, sendSameDayReminders } from '../modules/appointment/appointment-notification.service'
import { sendDailyGlucoseReminders } from '../modules/glucose/glucose-reminder.service'

export function initAppointmentRemindersCron() {
	// แจ้งเตือนล่วงหน้า 3 วัน ทุกวันเวลา 09:00 น.
	cron.schedule('0 9 * * *', async () => {
		console.log('⏰ [CRON] Running 3-day appointment reminders at 09:00')
		await sendThreeDayReminders()
	}, {
		timezone: 'Asia/Bangkok'
	})

	// แจ้งเตือนวันนัดหมาย ทุกวันเวลา 05:00 น.
	cron.schedule('0 5 * * *', async () => {
		console.log('⏰ [CRON] Running same-day appointment reminders at 05:00')
		await sendSameDayReminders()
	}, {
		timezone: 'Asia/Bangkok'
	})

	// แจ้งเตือนบันทึกค่าน้ำตาลประจำวัน ทุกวันเวลา 11:30 น. (ทดสอบ)
	cron.schedule('45 11 * * *', async () => {
		console.log('⏰ [CRON] Running daily glucose reminders at 11:30')
		await sendDailyGlucoseReminders()
	}, {
		timezone: 'Asia/Bangkok'
	})

	console.log('✅ Reminder cron jobs initialized')
	console.log('   - 3-day appointment reminders: Every day at 09:00 (Asia/Bangkok)')
	console.log('   - Same-day appointment reminders: Every day at 05:00 (Asia/Bangkok)')
	console.log('   - Daily glucose reminders: Every day at 11:30 (Asia/Bangkok) [TESTING]')
}
