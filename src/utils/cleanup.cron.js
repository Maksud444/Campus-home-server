import cron from 'node-cron'

// Dynamically import Property model
const getPropertyModel = async () => {
  try {
    const { default: Property } = await import('../models/Property.model.js')
    return Property
  } catch (error) {
    console.error('Failed to load Property model:', error)
    return null
  }
}

// Run cleanup every day at 2 AM
export const startCleanupCron = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('🕐 Running property cleanup cron job...')
    try {
      const Property = await getPropertyModel()
      if (Property && Property.cleanupDeleted) {
        await Property.cleanupDeleted()
      }
    } catch (error) {
      console.error('❌ Cleanup cron error:', error)
    }
  })

  console.log('✅ Cleanup cron job started (runs daily at 2 AM)')
}

// Manual cleanup function (for testing)
export const runCleanupNow = async () => {
  console.log('🧹 Running manual cleanup...')
  try {
    const Property = await getPropertyModel()
    if (Property && Property.cleanupDeleted) {
      await Property.cleanupDeleted()
    }
  } catch (error) {
    console.error('❌ Manual cleanup error:', error)
  }
}