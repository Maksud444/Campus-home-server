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

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) throw new Error('MONGODB_URI missing')

mongoose.connect(MONGODB_URI, {
  bufferCommands: false,
  serverSelectionTimeoutMS: 30000,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err))

// Import config
import './config/passport.js'

// Import routes
import authRoutes from './routes/auth.routes.js'
import propertyRoutes from './routes/property.routes.js'
import postRoutes from './routes/post.routes.js'
import userRoutes from './routes/user.routes.js'
import serviceRoutes from './routes/service.routes.js'
import bookingRoutes from './routes/booking.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import uploadRoutes from './routes/upload.routes.js'

// Root
app.get('/', (req, res) => {
  res.json({ message: 'API running' })
})

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' })
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

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

// Error
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Server error' })
})

export default app;