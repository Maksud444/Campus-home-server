// src/server.js
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import passport from 'passport'

dotenv.config()

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
    res.json({
      status: 'OK',
      mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      time: new Date().toISOString()
    })
  } catch (err) {
    res.status(500).json({ status: 'Error', error: err.message })
  }
})

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Student Housing API running 🚀' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  console.error('Stack:', err.stack)
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// --------------------
// MongoDB Serverless Compatible Connection
// --------------------
const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing!')
  throw new Error('MONGODB_URI is required')
}

let cached = global.mongoose
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn
  }
  
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    }
    
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then(m => {
        console.log('✅ MongoDB connected')
        return m.connection
      })
      .catch(err => {
        console.error('❌ MongoDB connection error:', err.message)
        cached.promise = null
        throw err
      })
  }
  
  try {
    cached.conn = await cached.promise
  } catch (err) {
    cached.promise = null
    throw err
  }
  
  return cached.conn
}

// Only connect in development or on first request
if (process.env.NODE_ENV !== 'production') {
  connectToDatabase()
    .then(() => console.log('✅ Development MongoDB connected'))
    .catch(err => console.error('❌ Development MongoDB error:', err.message))
}

export default app