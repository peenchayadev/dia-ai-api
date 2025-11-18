import { model } from './gemini.client'
import { buffer as streamToBuffer } from 'node:stream/consumers' 
import type { AudioInput, ImageInput } from './gemini.type'
import type { ImagesResult } from '../line/line.type'

//----------------//
// Text Analysis
//----------------//
export async function analyzeTextFromUser(text: string) {
	try {
		const prompt = `
            คุณคือ AI ผู้ช่วยสำหรับแอปพลิเคชันผู้ป่วยเบาหวาน มีหน้าที่วิเคราะห์ข้อความจากผู้ใช้
            ข้อความของผู้ใช้: "${text}"

            วิเคราะห์และจัดประเภทข้อความออกเป็นหนึ่งในสามประเภท: "logging", "question", หรือ "irrelevant"

            1.  ถ้าเป็น **"logging" (การบันทึกค่าน้ำตาล)**:
                - ดึงค่าตัวเลข (glucose value) ออกมา
                - ระบุช่วงเวลา (timing) ให้ตรงกับค่าใดค่าหนึ่งในลิสต์นี้เท่านั้น:
                  ['MORNING_BEFORE', 'MORNING_AFTER', 'LUNCH_BEFORE', 'LUNCH_AFTER', 'DINNER_BEFORE', 'DINNER_AFTER', 'BEDTIME', 'OTHER']
                - ตอบกลับเป็น JSON object โดยใช้ตัวอย่างรูปแบบนี้ (ไม่ต้องมีวงเล็บเหลี่ยมครอบ value):
                  {
                    "type": "logging", 
                    "value": 150, 
                    "timing": "MORNING_BEFORE"
                  }

            2.  ถ้าเป็น **"question" (คำถามทั่วไปเกี่ยวกับเบาหวาน)**:
                - ตอบกลับเป็น JSON object รูปแบบนี้:
                  {
                    "type": "question", 
                    "query": "[คำถามของผู้ใช้]"
                  }

            3.  ถ้าเป็น **"irrelevant" (ไม่เกี่ยวข้อง)**:
                - ตอบกลับเป็น JSON object รูปแบบนี้:
                  {
                    "type": "irrelevant 
                  }

            สำคัญมาก: ตอบกลับเป็น JSON object ที่ถูกต้องและไม่มีข้อความอื่นใดปะปน
        `

		const result = await model.generateContent(prompt)
		const responseText = result.response.text()
		const jsonString = responseText.replace(/```json|```/g, '').trim()
		return JSON.parse(jsonString)
	} catch (error) {
		console.error('Error analyzing text with Gemini:', error)
		return { type: 'error' }
	}
}

//----------------//
// QA Analysis
//----------------//
export async function getDiabetesAnswer(query: string): Promise<string> {
	try {
		const prompt = `
            คุณคือ AI ผู้ช่วยที่ให้ข้อมูลด้านสุขภาพสำหรับผู้ป่วยเบาหวาน หน้าที่ของคุณคือตอบคำถามต่อไปนี้ด้วยความเห็นอกเห็นใจและให้ข้อมูลที่ถูกต้อง
            
            คำถามของผู้ใช้: "${query}"

            ข้อกำหนดในการตอบ:
            1.  ให้ข้อมูลที่ถูกต้องและเป็นกลางเกี่ยวกับการจัดการโรคเบาหวานทั่วไป (เช่น อาหาร, การออกกำลังกาย, การใช้ยาเบื้องต้น)
            2.  ใช้ภาษาที่เข้าใจง่าย กระชับ และเป็นภาษาไทย
            3.  จะต้องมีข้อความเตือนปิดท้ายในย่อหน้าสุดท้ายเสมอว่า "ข้อมูลนี้เป็นเพียงคำแนะนำเบื้องต้น ไม่สามารถทดแทนคำวินิจฉัยหรือคำแนะนำจากแพทย์ได้ ควรปรึกษาแพทย์ผู้เชี่ยวชาญเพื่อรับการประเมินและการรักษาที่เหมาะสมกับคุณ"
            4.  คำตอบต้องเข้าใจง่าย กระชับ และไม่ยาวจนเกินไป

            สร้างคำตอบตามข้อกำหนดข้างต้น
        `

		const result = await model.generateContent(prompt)
		const response = await result.response
		return response.text()
	} catch (error) {
		console.error('Error generating answer with Gemini:', error)
		// คืนค่าเป็นข้อความแสดงข้อผิดพลาดที่เป็นมิตรต่อผู้ใช้
		return 'ขออภัยค่ะ ขณะนี้ระบบขัดข้อง ไม่สามารถให้คำตอบได้ โปรดลองอีกครั้งในภายหลัง'
	}
}

//----------------//
// Voice Analysis
//----------------//
export async function transcribeAudioWithGoogle(
  input: AudioInput,
  opts?: { mimeType?: string }
): Promise<string> {
  try {
    const audioBuffer = Buffer.isBuffer(input) ? input : await streamToBuffer(input)
    const mimeType = opts?.mimeType ?? 'audio/mp4'

    const audioPart = bufferToGenerativePart(audioBuffer, mimeType)
    const prompt = 'Please transcribe this audio file in Thai language.'

    const result = await model.generateContent([prompt, audioPart])
    const transcribedText = result.response.text()

    console.log('Google AI transcription result:', transcribedText)
    return transcribedText
  } catch (error) {
    console.error('Error transcribing audio with Google AI:', error)
    throw new Error('Failed to transcribe audio.')
  }
}

function bufferToGenerativePart(buffer: Buffer, mimeType: string) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  }
}

//----------------//
// Image Analysis
//----------------//
export async function analyzeImage (input: ImageInput , opts?: { mimeType?: string }): Promise<ImagesResult> {
	 const prompt = `
        คุณคือ AI ผู้ช่วยคัดกรองเอกสารทางการแพทย์สำหรับผู้ป่วยเบาหวาน (Diabetes Specialist)
        หน้าที่ของคุณคือวิเคราะห์รูปภาพและแยกประเภทตามเงื่อนไขที่เข้มงวดมาก

        **กฎเหล็ก (Strict Rules):**
        1. สำหรับ "ใบนัดหมาย" ต้องตรวจสอบหาคำบ่งชี้ว่าเป็น **"โรคเบาหวาน"** เท่านั้น
        2. คำบ่งชี้ที่ยอมรับ: "เบาหวาน", "Diabetes", "DM", "NCD" (คลินิกโรคเรื้อรัง), "ต่อมไร้ท่อ" (Endocrine), "ระดับน้ำตาล", "HbA1c"
        3. **หากเป็นใบนัดโรคอื่น** (เช่น ทันตกรรม/ฟัน, จักษุ/ตา, กระดูก/Orthopedic, ศัลยกรรม, นัดฟังผลตรวจสุขภาพทั่วไปที่ไม่มีระบุเบาหวาน) **ห้าม** จัดเป็น "appointment_slip" เด็ดขาด **ให้จัดเป็น "other" ทันที**

        ให้ตอบกลับเป็น JSON object เท่านั้น โดยเลือก 1 ใน 4 รูปแบบนี้:

        ---
        **CASE 1: ภาพอาหาร**
        ถ้าภาพเป็นอาหาร เครื่องดื่ม หรือมื้ออาหาร
        {
          "image_type": "food",
          "food_name": "[ชื่ออาหารภาษาไทย]",
          "estimated_glucose": [ตัวเลขค่าน้ำตาลโดยประมาณ],
          "estimated_carbs": [ตัวเลขคาร์โบไฮเดรตโดยประมาณ],
          "recommendation": "[คำแนะนำสั้นๆ สำหรับผู้ป่วยเบาหวาน]"
        }

        ---
        **CASE 2: ผลตรวจเลือด (Lab)**
        ถ้ามีตารางค่าเลือด หรือค่าทางห้องปฏิบัติการ
        {
          "image_type": "lab_result",
          "fasting_glucose": [ตัวเลข หรือ null],
          "hba1c": [ตัวเลข หรือ null],
          "record_date": "[YYYY-MM-DD]",
          "normal_range_min": [ตัวเลข หรือ null],
          "normal_range_max": [ตัวเลข หรือ null],
          "fasting_glucose_unit": "mg/dL",
          "hba1c_unit": "%"
        }

        ---
        **CASE 3: ใบนัดหมายโรคเบาหวาน (Diabetes Appointment Only)**
        เงื่อนไข: ต้องพบคำว่า "เบาหวาน", "DM", "NCD", "ต่อมไร้ท่อ" หรือชื่อคลินิกที่เกี่ยวข้องชัดเจน
        {
            "image_type": "appointment_slip",
            "appointment_date": "[YYYY-MM-DD] (แปลง พ.ศ. เป็น ค.ศ. โดยลบ 543)",
            "start_time": "[HH:MM] (24 ชั่วโมง)",
            "end_time": "[HH:MM] (24 ชั่วโมง)",
            "age": "[อายุ หรือ null]",
            "full_name": "[ชื่อ-นามสกุลผู้ป่วย หรือ null]",
            "doctor_name": "[ชื่อแพทย์ หรือ null]",
            "hospital_name": "[ชื่อโรงพยาบาล หรือ null]",
            "reason": "[ระบุเหตุผลการนัด เช่น ติดตามเบาหวาน, รับยา]",
            "details": "[รายละเอียดเพิ่มเติม]"
        }

        ---
        **CASE 4: อื่นๆ (Other)**
        - กรณีเป็นใบนัดโรคอื่นที่ไม่ใช่เบาหวาน (เช่น นัดทำฟัน, นัดผ่าตัดกระดูก) ให้ตอบอันนี้
        - กรณีรูปภาพไม่ชัดเจน หรือไม่ใช่เอกสารการแพทย์
        {
          "image_type": "other",
          "reason": "ไม่ใช่ใบนัดเบาหวาน หรือ ไม่สามารถระบุประเภทได้"
        }
    `

	try {
    const imageBuffer = Buffer.isBuffer(input) ? input : await streamToBuffer(input)
    const mimeType = opts?.mimeType ?? 'image/jpeg'

    const imagePart = bufferToGenerativePart(imageBuffer, mimeType)
		const result = await model.generateContent([prompt, imagePart])
		const responseText = result.response.text()
		const jsonString = responseText.replace(/```json|```/g, '').trim()
		return JSON.parse(jsonString)
	} catch (error) {
		console.error('Error analyzing image with Gemini:', error)
    return { image_type: 'error' }
	}
}


