/**
 * Admin Seed Script
 * Deletes any existing admin and creates a fresh one.
 * Usage: node src/scripts/seedAdmin.js
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  role: { type: String, default: 'student' },
  provider: { type: String, default: 'local' },
  verified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  phone: { type: String, default: '' },
  university: { type: String, default: '' },
  location: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)

const seedAdmin = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

    if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error('❌ Set MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD in .env')
      process.exit(1)
    }

    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected')

    // Delete any existing admin with this email (clean slate)
    await User.deleteOne({ email: ADMIN_EMAIL.toLowerCase() })
    console.log('🗑️  Removed any existing admin with that email')

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)

    const admin = await User.create({
      name: 'System Admin',
      email: ADMIN_EMAIL.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin',
      provider: 'local',
      verified: true,
      isBanned: false,
    })

    console.log('✅ Admin created successfully!')
    console.log('   Email:', admin.email)
    console.log('   ID:', admin._id)
    console.log('   Keep credentials private.')

    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

seedAdmin()
