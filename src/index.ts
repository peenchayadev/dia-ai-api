import { Elysia } from "elysia"
import cors from "@elysiajs/cors"
import { swagger } from "@elysiajs/swagger"
import { lineRouter } from "./modules/line/line.controller"
import { authRouter } from "./modules/auth/auth.controller"
import { glucoseRouter } from "./modules/glucose/glucose.controller"

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

  .listen(PORT)

  console.log(
    `DIA-AI Backend running on :${PORT}`
  )