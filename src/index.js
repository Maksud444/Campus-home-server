import app from './server.js'
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT || 5000

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Import and start cleanup cron AFTER server starts
import('./utils/cleanup.cron.js')
  .then(module => {
    module.startCleanupCron()
  })
  .catch(err => {
    console.error('⚠️ Cleanup cron not available:', err.message)
  })