import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

const testUsers = [
  { name: 'Test Agent', email: 'agent1@test.com', password: '123456', role: 'agent' },
  { name: 'Test Student', email: 'student1@test.com', password: '123456', role: 'student' },
  { name: 'Test Owner', email: 'owner1@test.com', password: '123456', role: 'owner' },
  { name: 'Test Provider', email: 'provider1@test.com', password: '123456', role: 'service-provider' }
]

async function resetUsers() {
  try {
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected!')

    const User = mongoose.connection.collection('users')

    // Delete all users
    console.log('🗑️ Deleting all users...')
    const deleteResult = await User.deleteMany({})
    console.log(`✅ Deleted ${deleteResult.deletedCount} users`)

    // Create test users
    console.log('👥 Creating test users...')
    
    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      
      await User.insertOne({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      console.log(`✅ Created: ${userData.email}`)
    }

    console.log('\n🎉 All done!')
    console.log('\nTest Users:')
    testUsers.forEach(u => {
      console.log(`- ${u.email} / ${u.password} (${u.role})`)
    })

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

resetUsers()