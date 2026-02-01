import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
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

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || ''

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return true
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000
    })
    console.log('✅ MongoDB Connected')
    return true
  } catch (error) {
    console.error('❌ MongoDB Error:', error.message)
    return false
  }
}

// Connect to MongoDB
await connectDB()

// Import passport config (optional)
try {
  await import('./config/passport.js')
} catch (err) {
  console.log('Passport not loaded')
}

// Import ALL routes - MUST be at top level await
const authRoutes = (await import('./routes/auth.routes.js')).default
const propertyRoutes = (await import('./routes/property.routes.js')).default
const postRoutes = (await import('./routes/post.routes.js')).default
const userRoutes = (await import('./routes/user.routes.js')).default
const serviceRoutes = (await import('./routes/service.routes.js')).default
const bookingRoutes = (await import('./routes/booking.routes.js')).default
const dashboardRoutes = (await import('./routes/dashboard.routes.js')).default
const uploadRoutes = (await import('./routes/upload.routes.js')).default

console.log('✅ All routes imported')

// Health check routes
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Campus Egypt API Running',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  })
})

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  })
})

// Use routes - IMPORTANT: Must be AFTER imports!
app.use('/api/auth', authRoutes)
app.use('/api/properties', propertyRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/users', userRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/upload', uploadRoutes)

console.log('✅ All routes registered')

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
  console.error('Error:', err.message)
  res.status(500).json({ 
    success: false, 
    message: err.message 
  })
})

export default app