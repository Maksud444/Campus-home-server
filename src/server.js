// src/index.js  (or server.js) — ESM style
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import compression from 'compression';

// Routes (top-level imports — assuming ESM and .js extension)
import authRoutes from './routes/auth.routes.js';
import propertyRoutes from './routes/property.routes.js';
import postRoutes from './routes/post.routes.js';
import userRoutes from './routes/user.routes.js';
import serviceRoutes from './routes/service.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import adminRoutes from './routes/admin.routes.js';

dotenv.config();

const app = express();

// ────────────────────────────────────────────────
// Environment Validation
// ────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ CRITICAL: MONGODB_URI is not defined in .env');
  process.exit(1);
}

// ────────────────────────────────────────────────
// MongoDB Connection (Lazy + Cached)
// ────────────────────────────────────────────────
let isDBConnected = false;

async function ensureDBConnected() {
  if (isDBConnected || mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      // Optional: family: 4,  // Force IPv4 if you have DNS issues
      // maxPoolSize: 10,      // Tune based on traffic
    });

    isDBConnected = true;
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    throw error; // Let middleware catch it
  }
}

// Global DB connection middleware
app.use(async (req, res, next) => {
  try {
    await ensureDBConnected();
    next();
  } catch (err) {
    console.error('DB Connection Error in request:', err);
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable (database issue)',
    });
  }
});

// ────────────────────────────────────────────────
// Middleware
// ────────────────────────────────────────────────
app.use(compression());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Optional: Passport (if you're using it)
// try {
//   const passport = (await import('./config/passport.js')).default;
//   app.use(passport.initialize());
//   console.log('Passport initialized');
// } catch (err) {
//   console.log('Passport config not loaded (optional)');
// }

// ────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
const ADMIN_ROUTE = process.env.ADMIN_ROUTE_SECRET || 'admin'
app.use(`/api/${ADMIN_ROUTE}`, adminRoutes);

// Health & Root checks
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Campus Egypt API is running',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    env: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime(),
  });
});

// ────────────────────────────────────────────────
// 404 & Global Error Handler
// ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ────────────────────────────────────────────────
// Start server (only if this file is run directly)
// ────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} | Env: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;