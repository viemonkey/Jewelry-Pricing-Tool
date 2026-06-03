import * as dotenv from 'dotenv'
dotenv.config()

import app from './app'
import { connectDB } from './config/db'

const port = process.env.PORT || 3000

const startServer = async () => {
  // Connect to database and seed defaults
  await connectDB()

  app.listen(port, () => {
    console.log(`🚀 Backend đang chạy tại: http://localhost:${port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
