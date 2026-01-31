import mongoose from 'mongoose'

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  location: {
    city: String,
    area: String,
    address: String
  },
  propertyType: {
    type: String,
    enum: ['apartment', 'studio', 'villa', 'room', 'house'],
    required: true
  },
  bedrooms: Number,
  bathrooms: Number,
  area: Number, // in square meters
  
  images: [{
    url: String,
    public_id: String
  }],
  
  amenities: [String],
  
  // Contact Information
  whatsapp: {
    countryCode: {
      type: String,
      default: '+20'
    },
    number: {
      type: String,
      required: true,
      maxlength: 11,
      validate: {
        validator: function(v) {
          return /^\d{10,11}$/.test(v)
        },
        message: 'Phone number must be 10-11 digits'
      }
    }
  },
  
  contactPhone: String,
  contactEmail: String,
  
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Property status
  status: {
    type: String,
    enum: ['available', 'rented', 'not-available', 'deleted'],
    default: 'available'
  },
  
  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  permanentDeleteAt: {
    type: Date,
    default: null
  },
  
  // Stats
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Compound indexes only (removed duplicates)
propertySchema.index({ userId: 1, createdAt: -1 })
propertySchema.index({ status: 1, isDeleted: 1 })
propertySchema.index({ isDeleted: 1, permanentDeleteAt: 1 })

// Method to soft delete
propertySchema.methods.softDelete = function() {
  this.isDeleted = true
  this.status = 'not-available'
  this.deletedAt = new Date()
  this.permanentDeleteAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
  return this.save()
}

// Method to restore
propertySchema.methods.restore = function() {
  this.isDeleted = false
  this.status = 'available'
  this.deletedAt = null
  this.permanentDeleteAt = null
  return this.save()
}

// Static method to clean up permanently deleted properties
propertySchema.statics.cleanupDeleted = async function() {
  const now = new Date()
  const result = await this.deleteMany({
    isDeleted: true,
    permanentDeleteAt: { $lte: now }
  })
  console.log(`🗑️ Cleaned up ${result.deletedCount} permanently deleted properties`)
  return result
}

export default mongoose.model('Property', propertySchema)