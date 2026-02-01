import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import passport from 'passport'
import compression from 'compression'

dotenv.config()

const app = express()

// Middleware
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

// MongoDB Connection - Optimized for Vercel Serverless
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables')
}

let cachedDb = null

async function connectDB() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('✅ Using cached database connection')
    return cachedDb
  }

  try {
    console.log('🔄 Creating new database connection...')
    const db = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    })
    
    cachedDb = db
    console.log('✅ MongoDB Connected')
    return db
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message)
    throw error
  }
}

// Connect on startup
await connectDB()

// Import passport config
try {
  await import('./config/passport.js')
  console.log('✅ Passport config loaded')
} catch (err) {
  console.error('⚠️ Passport config error:', err.message)
}

// Import routes
let authRoutes, propertyRoutes, postRoutes, userRoutes, serviceRoutes, bookingRoutes, dashboardRoutes, uploadRoutes

try {
  const authModule = await import('./routes/auth.routes.js')
  const propertyModule = await import('./routes/property.routes.js')
  const postModule = await import('./routes/post.routes.js')
  const userModule = await import('./routes/user.routes.js')
  const serviceModule = await import('./routes/service.routes.js')
  const bookingModule = await import('./routes/booking.routes.js')
  const dashboardModule = await import('./routes/dashboard.routes.js')
  const uploadModule = await import('./routes/upload.routes.js')

  authRoutes = authModule.default
  propertyRoutes = propertyModule.default
  postRoutes = postModule.default
  userRoutes = userModule.default
  serviceRoutes = serviceModule.default
  bookingRoutes = bookingModule.default
  dashboardRoutes = dashboardModule.default
  uploadRoutes = uploadModule.default

  console.log('✅ All routes loaded successfully')
} catch (err) {
  console.error('❌ Error loading routes:', err.message)
  throw err
}

// Middleware to ensure DB connection before each request
app.use(async (req, res, next) => {
  try {
    await connectDB()
    next()
  } catch (error) {
    console.error('Database connection error:', error)
    res.status(503).json({ 
      success: false, 
      message: 'Database connection unavailable' 
    })
  }
})

// Root route
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Campus Egypt API',
    status: 'running',
    timestamp: new Date().toISOString()
  })
})

// Health check route
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  res.json({ 
    success: true, 
    status: 'OK', 
    mongodb: dbStatus,
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
  console.error('❌ Server Error:', err)
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})

export default app