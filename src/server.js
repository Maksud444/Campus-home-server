import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import passport from 'passport'

dotenv.config()

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
app.use(passport.initialize())

// MongoDB Connection - IMMEDIATELY
const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) throw new Error('❌ MONGODB_URI is missing!')

mongoose.set('strictQuery', false)
mongoose.set('bufferCommands', true) // ← CRITICAL CHANGE

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    })
    console.log('✅ MongoDB connected')
  } catch (err) {
    console.error('❌ MongoDB error:', err.message)
    setTimeout(connectDB, 5000) // Retry after 5 seconds
  }
}

// Connect immediately
connectDB()

// Import passport config AFTER mongoose setup
import('./config/passport.js').catch(err => console.error('Passport config error:', err))

// Import routes AFTER connection
let authRoutes, propertyRoutes, postRoutes, userRoutes, 
    serviceRoutes, bookingRoutes, dashboardRoutes, uploadRoutes

const loadRoutes = async () => {
  try {
    authRoutes = (await import('./routes/auth.routes.js')).default
    propertyRoutes = (await import('./routes/property.routes.js')).default
    postRoutes = (await import('./routes/post.routes.js')).default
    userRoutes = (await import('./routes/user.routes.js')).default
    serviceRoutes = (await import('./routes/service.routes.js')).default
    bookingRoutes = (await import('./routes/booking.routes.js')).default
    dashboardRoutes = (await import('./routes/dashboard.routes.js')).default
    uploadRoutes = (await import('./routes/upload.routes.js')).default

    // Register routes
    app.use('/api/auth', authRoutes)
    app.use('/api/properties', propertyRoutes)
    app.use('/api/posts', postRoutes)
    app.use('/api/users', userRoutes)
    app.use('/api/services', serviceRoutes)
    app.use('/api/bookings', bookingRoutes)
    app.use('/api/dashboard', dashboardRoutes)
    app.use('/api/upload', uploadRoutes)

    console.log('✅ Routes loaded')
  } catch (err) {
    console.error('❌ Route loading error:', err)
  }
}

loadRoutes()

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Student Housing API running 🚀' })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    time: new Date().toISOString()
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

export default app