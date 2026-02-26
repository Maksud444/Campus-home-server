import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false,
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'agent', 'owner', 'service-provider', 'admin'],
    default: 'student'
  },
  phone: {
    type: String,
    default: ''
  },
  university: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
  },
  verified: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: ''
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  savedProperties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }],
  serviceProviderInfo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider'
  },
  // Notification preferences for new listing alerts
  notificationPrefs: {
    newListings: { type: Boolean, default: false },
    locations: [{ type: String }],
    types: [{ type: String }],
    maxPrice: { type: Number, default: 0 },
  },
}, {
  timestamps: true
})

// Compound index only (email index already created by unique: true)
userSchema.index({ email: 1, role: 1 })

// Compare entered password with stored bcrypt hash
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password)
}

export default mongoose.model('User', userSchema)