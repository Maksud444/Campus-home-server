import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: String,
  phone: String,
  university: String,
  location: String,
  bio: String,
  avatar: String,
  provider: { type: String, default: 'local' },
  verified: { type: Boolean, default: false }
}, { timestamps: true })

const User = mongoose.model('User', userSchema)

const createUser = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected')

    // Check if user exists
    const existingUser = await User.findOne({ email: 'maksudbillah20@gmail.com' })
    
    if (existingUser) {
      console.log('✅ User already exists:', existingUser.email)
      console.log('User ID:', existingUser._id)
      console.log('Name:', existingUser.name)
      console.log('Role:', existingUser.role)
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash('password123', 10)
      
      const newUser = await User.create({
        name: 'Maksud Billah',
        email: 'maksudbillah20@gmail.com',
        password: hashedPassword,
        role: 'student',
        phone: '+8801234567890',
        university: 'Cairo University',
        location: 'Cairo, Egypt',
        bio: 'Student at Cairo University',
        avatar: '',
        provider: 'local',
        verified: true
      })

      console.log('✅ User created successfully!')
      console.log('Email:', newUser.email)
      console.log('User ID:', newUser._id)
      console.log('Password: password123')
    }

    await mongoose.connection.close()
    console.log('✅ Done')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

createUser()