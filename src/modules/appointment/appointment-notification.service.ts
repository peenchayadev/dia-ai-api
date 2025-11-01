import dayjs from 'dayjs'
import 'dayjs/locale/th'
import { prisma } from '../../prisma/client'
import { lineClient } from '../line/line.client'
import type { FlexMessage } from '@line/bot-sdk'

dayjs.locale('th')

// ส่งข้อความแจ้งเตือนแบบ Flex Message
async function sendAppointmentFlexMessage(
	lineUserId: string,
	appointment: any,
	notificationType: '3_DAY_REMINDER' | 'SAME_DAY_REMINDER'
) {
	const appointmentDate = dayjs(appointment.appointmentDate)
	const displayDate = appointmentDate.format('DD/MM/YYYY')
	const displayDay = appointmentDate.locale('th').format('dddd')

	const timeText = appointment.startTime
		? appointment.endTime
			? `${appointment.startTime} - ${appointment.endTime} น.`
			: `${appointment.startTime} น.`
		: 'ไม่ระบุเวลา'

	const headerText = notificationType === '3_DAY_REMINDER' ? '🔔 แจ้งเตือนนัดหมายล่วงหน้า' : '⏰ วันนี้มีนัดหมาย!'
	const headerColor = notificationType === '3_DAY_REMINDER' ? '#17c1e8' : '#f53939'
	const daysText = notificationType === '3_DAY_REMINDER' ? 'อีก 3 วัน' : 'วันนี้'

	const flexMessage: FlexMessage = {
		type: 'flex',
		altText: `${headerText} - ${displayDate}`,
		contents: {
			type: 'bubble',
			size: 'mega',
			header: {
				type: 'box',
				layout: 'vertical',
				contents: [
					{
						type: 'text',
						text: headerText,
						color: '#ffffff',
						size: 'lg',
						weight: 'bold'
					}
				],
				backgroundColor: headerColor,
				paddingAll: '20px'
			},
			body: {
				type: 'box',
				layout: 'vertical',
				contents: [
					{
						type: 'box',
						layout: 'vertical',
						contents: [
							{
								type: 'text',
								text: daysText,
								size: 'xs',
								color: '#8c8c8c',
								weight: 'bold'
							},
							{
								type: 'text',
								text: `${displayDay}ที่ ${displayDate}`,
								size: 'xl',
								weight: 'bold',
								color: '#1a1a1a',
								margin: 'xs'
							},
							{
								type: 'text',
								text: timeText,
								size: 'md',
								color: '#555555',
								margin: 'xs'
							}
						],
						margin: 'none'
					},
					{
						type: 'separator',
						margin: 'xl'
					},
					{
						type: 'box',
						layout: 'vertical',
						contents: [
							...(appointment.hospitalName
								? [
										{
											type: 'box' as const,
											layout: 'horizontal' as const,
											contents: [
												{
													type: 'text' as const,
													text: '🏥',
													size: 'sm' as const,
													flex: 0
												},
												{
													type: 'text' as const,
													text: appointment.hospitalName,
													size: 'sm' as const,
													color: '#555555',
													wrap: true,
													margin: 'sm' as const
												}
											],
											margin: 'md' as const
										}
									]
								: []),
							...(appointment.doctorName
								? [
										{
											type: 'box' as const,
											layout: 'horizontal' as const,
											contents: [
												{
													type: 'text' as const,
													text: '👨‍⚕️',
													size: 'sm' as const,
													flex: 0
												},
												{
													type: 'text' as const,
													text: appointment.doctorName,
													size: 'sm' as const,
													color: '#555555',
													wrap: true,
													margin: 'sm' as const
												}
											],
											margin: 'md' as const
										}
									]
								: []),
							...(appointment.reason
								? [
										{
											type: 'box' as const,
											layout: 'horizontal' as const,
											contents: [
												{
													type: 'text' as const,
													text: '📋',
													size: 'sm' as const,
													flex: 0
												},
												{
													type: 'text' as const,
													text: appointment.reason,
													size: 'sm' as const,
													color: '#555555',
													wrap: true,
													margin: 'sm' as const
												}
											],
											margin: 'md' as const
										}
									]
								: [])
						],
						margin: 'xl'
					}
				],
				paddingAll: '20px'
			},
			footer: {
				type: 'box',
				layout: 'vertical',
				contents: [
					{
						type: 'text',
						text: notificationType === '3_DAY_REMINDER' ? 'อย่าลืมเตรียมตัวนะคะ 💙' : 'ขอให้เดินทางปลอดภัยนะคะ 💙',
						size: 'xs',
						color: '#8c8c8c',
						align: 'center'
					}
				],
				paddingAll: '15px'
			}
		}
	}

	await lineClient.pushMessage(lineUserId, flexMessage)
}

// แจ้งเตือนล่วงหน้า 3 วัน (9:00 น.)
export async function sendThreeDayReminders() {
	console.log('🔔 Running 3-day appointment reminders...')

	const threeDaysFromNow = dayjs().add(3, 'day').startOf('day')
	const threeDaysEnd = threeDaysFromNow.endOf('day')

	try {
		const appointments = await prisma.appointment.findMany({
			where: {
				appointmentDate: {
					gte: threeDaysFromNow.toDate(),
					lte: threeDaysEnd.toDate()
				}
			},
			include: {
				user: true,
				notificationLogs: {
					where: {
						notificationType: '3_DAY_REMINDER'
					}
				}
			}
		})

		console.log(`📅 Found ${appointments.length} appointments in 3 days`)

		for (const appointment of appointments) {
			// ตรวจสอบว่าส่งแจ้งเตือนไปแล้วหรือยัง
			if (appointment.notificationLogs.length > 0) {
				console.log(`⏭️ Skipping appointment ${appointment.id} - already notified`)
				continue
			}

			try {
				await sendAppointmentFlexMessage(appointment.user.lineUserId, appointment, '3_DAY_REMINDER')

				// บันทึก log
				await prisma.notificationLog.create({
					data: {
						userId: appointment.userId,
						appointmentId: appointment.id,
						notificationType: '3_DAY_REMINDER',
						success: true
					}
				})

				console.log(`✅ Sent 3-day reminder for appointment ${appointment.id}`)
			} catch (error) {
				console.error(`❌ Failed to send 3-day reminder for appointment ${appointment.id}:`, error)

				// บันทึก error log
				await prisma.notificationLog.create({
					data: {
						userId: appointment.userId,
						appointmentId: appointment.id,
						notificationType: '3_DAY_REMINDER',
						success: false,
						errorMessage: error instanceof Error ? error.message : 'Unknown error'
					}
				})
			}
		}
	} catch (error) {
		console.error('❌ Error in sendThreeDayReminders:', error)
	}
}

// แจ้งเตือนวันนัดหมาย (5:00 น.)
export async function sendSameDayReminders() {
	console.log('⏰ Running same-day appointment reminders...')

	const today = dayjs().startOf('day')
	const todayEnd = today.endOf('day')

	try {
		const appointments = await prisma.appointment.findMany({
			where: {
				appointmentDate: {
					gte: today.toDate(),
					lte: todayEnd.toDate()
				}
			},
			include: {
				user: true,
				notificationLogs: {
					where: {
						notificationType: 'SAME_DAY_REMINDER'
					}
				}
			}
		})

		console.log(`📅 Found ${appointments.length} appointments today`)

		for (const appointment of appointments) {
			// ตรวจสอบว่าส่งแจ้งเตือนไปแล้วหรือยัง
			if (appointment.notificationLogs.length > 0) {
				console.log(`⏭️ Skipping appointment ${appointment.id} - already notified`)
				continue
			}

			try {
				await sendAppointmentFlexMessage(appointment.user.lineUserId, appointment, 'SAME_DAY_REMINDER')

				// บันทึก log
				await prisma.notificationLog.create({
					data: {
						userId: appointment.userId,
						appointmentId: appointment.id,
						notificationType: 'SAME_DAY_REMINDER',
						success: true
					}
				})

				console.log(`✅ Sent same-day reminder for appointment ${appointment.id}`)
			} catch (error) {
				console.error(`❌ Failed to send same-day reminder for appointment ${appointment.id}:`, error)

				// บันทึก error log
				await prisma.notificationLog.create({
					data: {
						userId: appointment.userId,
						appointmentId: appointment.id,
						notificationType: 'SAME_DAY_REMINDER',
						success: false,
						errorMessage: error instanceof Error ? error.message : 'Unknown error'
					}
				})
			}
		}
	} catch (error) {
		console.error('❌ Error in sendSameDayReminders:', error)
	}
}
