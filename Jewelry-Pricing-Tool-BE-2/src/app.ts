import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { join } from 'path'
import routes from './routes'

const app = express()

// CORS configuration
app.use(
  cors({
    origin: process.env.FE_URL || 'http://localhost:3001',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files statically
app.use('/uploads', express.static(join(process.cwd(), 'uploads')))

// Hello World endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!')
})

// Centralized Router
app.use('/', routes)

// Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'
  
  if (statusCode === 500) {
    console.error('[Error Handler]', err)
  }

  res.status(statusCode).json({
    statusCode,
    message,
    error: err.name || 'Error',
  })
})

export default app
