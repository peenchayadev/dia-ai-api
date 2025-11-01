import dayjs from 'dayjs'
import { prisma } from '../../prisma/client'
import { lineClient } from '../line/line.client'

// ข้อความแจ้งเตือนแบบสุ่ม เพื่อให้ไม่น่าเบื่อ
const reminderMessages = [
	'สวัสดีตอนเช้า ☀️ อย่าลืมวัดและบันทึกค่าน้ำตาลวันนี้นะคะ',
	'อรุณสวัสดิ์ค่ะ 🌅 มาบันทึกค่าน้ำตาลกันเถอะ เพื่อสุขภาพที่ดีขึ้น',
	'ตื่นแล้วหรือยังคะ 😊 อย่าลืมวัดค่าน้ำตาลตอนเช้านะ',
	'สวัสดีค่ะ 💙 วันนี้อย่าลืมบันทึกค่าน้ำตาลด้วยนะคะ',
	'เช้าวันใหม่ ☕ มาเริ่มต้นด้วยการวัดค่าน้ำตาลกันเถอะ',
	'สวัสดีตอนเช้า 🌤️ ถึงเวลาบันทึกค่าน้ำตาลแล้วค่ะ',
	'อรุณสวัสดิ์ 🌻 อย่าลืมดูแลสุขภาพด้วยการบันทึกค่าน้ำตาลนะคะ',
	'สวัสดีค่ะ 😊 วันนี้บันทึกค่าน้ำตาลแล้วหรือยังคะ',
	'ตื่นมาแล้วอย่าลืมวัดค่าน้ำตาลนะคะ 💪 เพื่อติดตามสุขภาพของเรา',
	'เช้าวันใหม่ที่สดใส ☀️ มาบันทึกค่าน้ำตาลกันเถอะค่ะ'
]

// สุ่มข้อความแจ้งเตือน
function getRandomReminderMessage(): string {
	const randomIndex = Math.floor(Math.random() * reminderMessages.length)
	return reminderMessages[randomIndex]
}

// ส่งแจ้งเตือนบันทึกค่าน้ำตาลประจำวัน
export async function sendDailyGlucoseReminders() {
	console.log('🔔 Running daily glucose reminders...')

	const today = dayjs().startOf('day')
	const todayEnd = today.endOf('day')

	try {
		// หา user ทั้งหมด
		const allUsers = await prisma.user.findMany({
			select: {
				id: true,
				lineUserId: true,
				glucoseLogs: {
					where: {
						recordedAt: {
							gte: today.toDate(),
							lte: todayEnd.toDate()
						}
					},
					take: 1
				}
			}
		})

		console.log(`👥 Found ${allUsers.length} total users`)

		// กรอง user ที่ยังไม่ได้บันทึกในวันนี้
		const usersWithoutLog = allUsers.filter((user) => user.glucoseLogs.length === 0)

		console.log(`📝 ${usersWithoutLog.length} users haven't logged glucose today`)

		let successCount = 0
		let failCount = 0

		for (const user of usersWithoutLog) {
			try {
				const message = getRandomReminderMessage()
				await lineClient.pushMessage(user.lineUserId, {
					type: 'text',
					text: message
				})

				successCount++
				console.log(`✅ Sent reminder to user ${user.id}`)
			} catch (error) {
				failCount++
				console.error(`❌ Failed to send reminder to user ${user.id}:`, error)
			}
		}

		console.log(`📊 Summary: ${successCount} sent, ${failCount} failed`)
	} catch (error) {
		console.error('❌ Error in sendDailyGlucoseReminders:', error)
	}
}
