import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import passport from 'passport'
import compression from 'compression'

dotenv.config()

const app = express()

// Compression middleware for faster responses
app.use(compression())

// CORS Configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://campus-egypt-nextjs.vercel.app',
    'https://campus-home-client-v2.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(passport.initialize())

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000)
  res.setTimeout(30000)
  next()
})

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file')
  if (process.env.VERCEL !== '1') {
    process.exit(1)
  }
}

console.log('🔗 Connecting to MongoDB...')
mongoose.set('strictQuery', false)

let isConnected = false

const connectDB = async () => {
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection')
    return
  }

  try {
    console.log('🔄 Attempting MongoDB connection...')
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 75000,
      connectTimeoutMS: 30000,
      maxPoolSize: 50,
      minPoolSize: 10,
      maxIdleTimeMS: 60000,
      retryWrites: true,
      w: 'majority',
      family: 4,
      compressors: ['zlib']
    })
    
    isConnected = true
    console.log('✅ MongoDB Connected Successfully')
    console.log('📊 Database:', mongoose.connection.name)
    console.log('🌐 Host:', mongoose.connection.host)

  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message)
    isConnected = false
    
    // Don't crash in production, just log
    if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
      process.exit(1)
    }
  }
}

// Connection event handlers
mongoose.connection.on('connected', () => {
  isConnected = true
  console.log('✅ Mongoose connected to MongoDB')
})

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err)
  isConnected = false
})

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected')
  isConnected = false
})

// Connect to database
await connectDB()

// Import config AFTER connection
try {
  await import('./config/passport.js')
  console.log('✅ Passport config loaded')
} catch (err) {
  console.error('⚠️ Passport config not loaded:', err.message)
}

// Import routes AFTER connection
import authRoutes from './routes/auth.routes.js'
import propertyRoutes from './routes/property.routes.js'
import postRoutes from './routes/post.routes.js'
import userRoutes from './routes/user.routes.js'
import serviceRoutes from './routes/service.routes.js'
import bookingRoutes from './routes/booking.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import uploadRoutes from './routes/upload.routes.js'

console.log('✅ All routes loaded')

// Health check routes
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Campus Egypt API',
    status: 'running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  })
})

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState
  const dbStatus = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  }

  res.json({ 
    success: true,
    status: dbState === 1 ? 'OK' : 'WARNING',
    mongodb: dbStatus[dbState] || 'Unknown',
    database: mongoose.connection.name || 'N/A',
    host: mongoose.connection.host || 'N/A',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/properties', propertyRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/users', userRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/upload', uploadRoutes)

// 404 handler - Return JSON
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.path
  })
})

// Error handler - Always return JSON
app.use((err, req, res, next) => {
  console.error('❌ Error:', err)
  
  // Always return JSON response
  res.status(err.status || 500).json({ 
    success: false,
    message: err.message || 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})

export default app
