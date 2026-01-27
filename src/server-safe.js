// src/server.js
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import passport from 'passport'

// Load environment variables
dotenv.config()

// Import passport config - wrapped in try-catch to prevent crashes
try {
  await import('./config/passport.js')
} catch (err) {
  console.warn('⚠️  Passport config not loaded:', err.message)
}

const app = express()

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://campus-egypt-nextjs.vercel.app'
  ],
  credentials: true
}))

// Body parsers
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Passport initialize
app.use(passport.initialize())

// Request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Root route - Test if basic server works
app.get('/', (req, res) => {
  res.json({ 
    message: 'Student Housing API running 🚀',
    status: 'OK',
    timestamp: new Date().toISOString()
  })
})

// Health check - Test MongoDB connection
app.get('/api/health', async (req, res) => {
  try {
    await connectToDatabase()
    const dbState = mongoose.connection.readyState
    res.json({
      status: 'OK',
      mongodb: dbState === 1 ? 'Connected' : 'Disconnected',
      dbState: dbState,
      time: new Date().toISOString()
    })
  } catch (err) {
    console.error('Health check error:', err)
    res.status(500).json({ 
      status: 'Error', 
      error: err.message,
      mongodb: 'Failed to connect'
    })
  }
})

// Import routes with error handling
let authRoutes, propertyRoutes, postRoutes, userRoutes, 
    serviceRoutes, bookingRoutes, dashboardRoutes, uploadRoutes

try {
  const modules = await Promise.all([
    import('./routes/auth.routes.js').catch(e => ({ default: null, error: e })),
    import('./routes/property.routes.js').catch(e => ({ default: null, error: e })),
    import('./routes/post.routes.js').catch(e => ({ default: null, error: e })),
    import('./routes/user.routes.js').catch(e => ({ default: null, error: e })),
    import('./routes/service.routes.js').catch(e => ({ default: null, error: e })),
    import('./routes/booking.routes.js').catch(e => ({ default: null, error: e })),
    import('./routes/dashboard.routes.js').catch(e => ({ default: null, error: e })),
    import('./routes/upload.routes.js').catch(e => ({ default: null, error: e }))
  ])

  authRoutes = modules[0].default
  propertyRoutes = modules[1].default
  postRoutes = modules[2].default
  userRoutes = modules[3].default
  serviceRoutes = modules[4].default
  bookingRoutes = modules[5].default
  dashboardRoutes = modules[6].default
  uploadRoutes = modules[7].default

  // Register routes only if they loaded successfully
  if (authRoutes) app.use('/api/auth', authRoutes)
  if (propertyRoutes) app.use('/api/properties', propertyRoutes)
  if (postRoutes) app.use('/api/posts', postRoutes)
  if (userRoutes) app.use('/api/users', userRoutes)
  if (serviceRoutes) app.use('/api/services', serviceRoutes)
  if (bookingRoutes) app.use('/api/bookings', bookingRoutes)
  if (dashboardRoutes) app.use('/api/dashboard', dashboardRoutes)
  if (uploadRoutes) app.use('/api/upload', uploadRoutes)

  console.log('✅ Routes loaded successfully')
} catch (err) {
  console.error('❌ Error loading routes:', err)
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message)
  console.error('Stack:', err.stack)
  
  res.status(err.status || 500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    path: req.path
  })
})

// --------------------
// MongoDB Connection with Caching for Serverless
// --------------------
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is missing!')
  console.error('Please add it in Vercel Dashboard → Settings → Environment Variables')
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined')
  }

  if (cached.conn) {
    console.log('✅ Using cached MongoDB connection')
    return cached.conn
  }
  
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
    
    console.log('🔄 Connecting to MongoDB...')
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then(m => {
        console.log('✅ MongoDB connected successfully')
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

// Connect immediately in development
if (process.env.NODE_ENV !== 'production') {
  connectToDatabase()
    .then(() => console.log('✅ Development MongoDB connected'))
    .catch(err => console.error('❌ Development MongoDB error:', err.message))
}

// Export the Express app
export default app