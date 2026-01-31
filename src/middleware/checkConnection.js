import mongoose from 'mongoose'

export const checkConnection = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is not available. Please try again later.',
      status: 'Service Unavailable'
    })
  }
  next()
}