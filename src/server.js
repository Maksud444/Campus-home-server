import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import compression from 'compression'

dotenv.config()

const app = express()

// Basic middleware
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

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || ''

let isConnected = false

async function connectDB() {
  if (isConnected) {
    return
  }

  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found')
    }

    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000
    })
    
    isConnected = true
    console.log('MongoDB Connected')
  } catch (error) {
    console.error('MongoDB Error:', error.message)
    // Don't throw - continue without DB for health check
  }
}

// Connect
connectDB().catch(err => console.error('Initial DB connection failed:', err))

// Health check FIRST (before routes that might fail)
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Running',
    mongodb: isConnected ? 'Connected' : 'Disconnected'
  })
})

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'OK',
    mongodb: isConnected ? 'Connected' : 'Disconnected'
  })
})

// Import routes with try-catch
let routesLoaded = false

async function loadRoutes() {
  if (routesLoaded) return

  try {
    // Import passport config (optional)
    try {
      await import('./config/passport.js')
      console.log('Passport loaded')
    } catch (err) {
      console.log('Passport not loaded:', err.message)
    }

    // Import routes
    const authModule = await import('./routes/auth.routes.js')
    const propertyModule = await import('./routes/property.routes.js')
    const postModule = await import('./routes/post.routes.js')
    const userModule = await import('./routes/user.routes.js')
    const serviceModule = await import('./routes/service.routes.js')
    const bookingModule = await import('./routes/booking.routes.js')
    const dashboardModule = await import('./routes/dashboard.routes.js')
    const uploadModule = await import('./routes/upload.routes.js')

    // Use routes
    app.use('/api/auth', authModule.default)
    app.use('/api/properties', propertyModule.default)
    app.use('/api/posts', postModule.default)
    app.use('/api/users', userModule.default)
    app.use('/api/services', serviceModule.default)
    app.use('/api/bookings', bookingModule.default)
    app.use('/api/dashboard', dashboardModule.default)
    app.use('/api/upload', uploadModule.default)

    routesLoaded = true
    console.log('Routes loaded')
  } catch (err) {
    console.error('Route loading error:', err.message)
    // Don't throw - app will still work for health checks
  }
}

// Load routes
loadRoutes().catch(err => console.error('Failed to load routes:', err))

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(500).json({ 
    success: false, 
    message: err.message 
  })
})

export default app