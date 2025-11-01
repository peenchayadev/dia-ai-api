import { Elysia } from "elysia"
import cors from "@elysiajs/cors"
import { swagger } from "@elysiajs/swagger"
import { lineRouter } from "./modules/line/line.controller"
import { authRouter } from "./modules/auth/auth.controller"
import { glucoseRouter } from "./modules/glucose/glucose.controller"
import { appointmentRouter } from "./modules/appointment/appointment.controller"
import { foodRouter } from "./modules/food/food.controller"
import { historyRouter } from "./modules/history/history.controller"
import { labRouter } from "./modules/lab/lab.controller"
import { initAppointmentRemindersCron } from "./cron/appointment-reminders.cron"

const PORT = process.env.PORT || Bun.env.PORT || 3001

export const app = new Elysia()
  .use(cors())
  .use(swagger({ 
    path: '/docs',
    documentation: {
      info: {
        title: 'DIA-AI Backend API',
        version: '1.0.0',
        description: 'API สำหรับแอปพลิเคชันผู้ป่วยเบาหวาน'
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ]
    }
  }))
  .use(lineRouter)
  .use(authRouter)
  .use(glucoseRouter)
  .use(appointmentRouter)
  .use(foodRouter)
  .use(historyRouter)
  .use(labRouter)

  .listen(PORT)

// Initialize cron jobs
initAppointmentRemindersCron()

console.log(
  `DIA-AI Backend running on :${PORT}`
)