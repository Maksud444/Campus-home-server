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
  
  // Post Type (property, roommate, room)
  type: {
    type: String,
    enum: ['property', 'roommate', 'room'],
    default: 'property'
  },
  
  price: {
    type: Number
  },
  
  location: {
    city: {
      type: String,
      required: true
    },
    area: {
      type: String,
      required: true
    },
    address: String
  },
  
  propertyType: {
    type: String,
    enum: ['apartment', 'studio', 'villa', 'room', 'house'],
    default: 'apartment'
  },
  
  bedrooms: Number,
  bathrooms: Number,
  area: Number,
  
  furnished: {
    type: Boolean,
    default: false
  },
  
  images: [{
    url: String,
    public_id: String
  }],
  
  videos: [String],
  
  amenities: [String],
  
  preferences: String,
  
  targetAudience: {
    type: String,
    enum: ['students', 'family', 'all'],
    default: 'students'
  },
  
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
    ref: 'User'
  },
  
  // User info (for when userId is not available)
  userName: String,
  userEmail: String,
  userImage: String,
  userRole: {
    type: String,
    enum: ['student', 'agent', 'owner', 'service-provider'],
    default: 'student'
  },
  
  // Property status
  status: {
    type: String,
    enum: ['available', 'rented', 'not-available', 'active', 'inactive'],
    default: 'active'
  },
  
  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  permanentDeleteAt: Date,
  
  // Stats
  views: {
    type: Number,
    default: 0
  },
  
  featured: {
    type: Boolean,
    default: false
  },
  
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Indexes
propertySchema.index({ userId: 1, createdAt: -1 })
propertySchema.index({ status: 1, isDeleted: 1 })
propertySchema.index({ 'location.city': 1 })
propertySchema.index({ type: 1 })

// Soft delete method
propertySchema.methods.softDelete = function() {
  this.isDeleted = true
  this.status = 'not-available'
  this.deletedAt = new Date()
  this.permanentDeleteAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  return this.save()
}

// Restore method
propertySchema.methods.restore = function() {
  this.isDeleted = false
  this.status = 'active'
  this.deletedAt = null
  this.permanentDeleteAt = null
  return this.save()
}

// Cleanup method
propertySchema.statics.cleanupDeleted = async function() {
  const now = new Date()
  const result = await this.deleteMany({
    isDeleted: true,
    permanentDeleteAt: { $lte: now }
  })
  console.log(`🗑️ Cleaned up ${result.deletedCount} properties`)
  return result
}

export default mongoose.model('Property', propertySchema)