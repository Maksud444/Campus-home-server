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

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://campus-egypt-nextjs.vercel.app',
    'https://campus-home-client-v2.vercel.app'
  ],
  credentials: true
}))

// Increase payload limit but add timeout
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(passport.initialize())

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000) // 30 seconds
  res.setTimeout(30000)
  next()
})

// MongoDB Connection with ENHANCED RETRY LOGIC
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file')
  process.exit(1)
}

console.log('🔗 Connecting to MongoDB...')
console.log('📍 URI:', MONGODB_URI.substring(0, 30) + '...')

mongoose.set('strictQuery', false)

// Enhanced connection function with retry logic
let isConnected = false

const connectDB = async (retries = 5) => {
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection')
    return
  }

  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`🔄 Connection attempt ${i}/${retries}...`)
      
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
        socketTimeoutMS: 75000, // Increased to 75 seconds
        connectTimeoutMS: 30000, // Increased to 30 seconds
        maxPoolSize: 50,
        minPoolSize: 10,
        maxIdleTimeMS: 60000, // Increased to 60 seconds
        retryWrites: true,
        w: 'majority',
        family: 4,
        compressors: ['zlib']
      })
      
      isConnected = true
      console.log('✅ MongoDB Connected Successfully')
      console.log('📊 Database:', mongoose.connection.name)
      console.log('🌐 Host:', mongoose.connection.host)
      return

    } catch (error) {
      console.error(`❌ Connection attempt ${i} failed:`, error.message)
      
      if (i === retries) {
        console.error('❌ All connection attempts failed')
        console.error('Full error:', error)
        
        // Don't exit in production, keep trying
        if (process.env.NODE_ENV !== 'production') {
          process.exit(1)
        }
      } else {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, i), 10000)
        console.log(`⏳ Waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
}

// Handle connection events
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
  
  // Try to reconnect after 5 seconds
  setTimeout(() => {
    console.log('🔄 Attempting to reconnect...')
    connectDB()
  }, 5000)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close()
    console.log('MongoDB connection closed through app termination')
    process.exit(0)
  } catch (err) {
    console.error('Error closing MongoDB connection:', err)
    process.exit(1)
  }
})

// Connect to database
await connectDB()

// Import config AFTER connection
import './config/passport.js'

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

// Routes
app.get('/', (req, res) => {
  res.json({ 
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
    status: dbState === 1 ? 'OK' : 'WARNING',
    mongodb: dbStatus[dbState] || 'Unknown',
    database: mongoose.connection.name || 'N/A',
    host: mongoose.connection.host || 'N/A',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/properties', propertyRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/users', userRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/upload', uploadRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.path
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err)
  res.status(500).json({ 
    success: false,
    message: 'Server error', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  })
})

export default app
