import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import passport from 'passport'
import compression from 'compression'

dotenv.config()

const app = express()

app.use(compression())
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://campus-egypt-nextjs.vercel.app'
  ],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(passport.initialize())

// MongoDB - CRITICAL FIX
let db = null

async function connectDB() {
  if (db) return db
  
  db = await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
  })
  
  return db
}

await connectDB()

// Import routes
import authRoutes from './routes/auth.routes.js'
import propertyRoutes from './routes/property.routes.js'
import postRoutes from './routes/post.routes.js'
import userRoutes from './routes/user.routes.js'
import serviceRoutes from './routes/service.routes.js'
import bookingRoutes from './routes/booking.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import uploadRoutes from './routes/upload.routes.js'

// Routes
app.get('/', (req, res) => res.json({ success: true, message: 'API Running' }))
app.get('/api/health', (req, res) => res.json({ success: true, status: 'OK' }))

app.use('/api/auth', authRoutes)
app.use('/api/properties', propertyRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/users', userRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/upload', uploadRoutes)

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }))
app.use((err, req, res, next) => res.status(500).json({ success: false, message: err.message }))

export default app