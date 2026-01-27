// server.js
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'

dotenv.config()

// Optional: Passport (keep initialize only, no session for Vercel)
import passport from 'passport'
import './config/passport.js'

// Routes
import authRoutes from './routes/auth.routes.js'
import propertyRoutes from './routes/property.routes.js'
import postRoutes from './routes/post.routes.js'
import userRoutes from './routes/user.routes.js'
import serviceRoutes from './routes/service.routes.js'
import bookingRoutes from './routes/booking.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import uploadRoutes from './routes/upload.routes.js'

const app = express()

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://campus-egypt-nextjs.vercel.app'
  ],
  credentials: true
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Passport initialize only (no session)
app.use(passport.initialize())

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/properties', propertyRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/users', userRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/upload', uploadRoutes)

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await connectToDatabase()
    res.json({ status: 'OK', mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected', time: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ status: 'Error', error: err.message })
  }
})

// Root
app.get('/', (req, res) => {
  res.json({ message: 'Student Housing API running 🚀' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Internal Server Error' })
})

// ------------------------
// MongoDB Serverless Compatible Connection
// ------------------------
const MONGODB_URI = process.env.MONGODB_URI

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null }
}

export async function connectToDatabase() {
  if (global.mongoose.conn) return global.mongoose.conn
  if (!global.mongoose.promise) {
    global.mongoose.promise = mongoose.connect(MONGODB_URI).then(m => m.connection)
  }
  global.mongoose.conn = await global.mongoose.promise
  return global.mongoose.conn
}

// Connect immediately (optional)
connectToDatabase().then(() => console.log('✅ MongoDB connected')).catch(err => console.error('❌ MongoDB error', err))

export default app
