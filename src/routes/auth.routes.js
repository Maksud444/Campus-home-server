import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'

const router = express.Router()

// ========================
// REGISTER
// ========================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    console.log('📝 Register attempt:', { name, email, role })
    console.log('📝 Password received:', password ? `Yes (${password.length} chars)` : 'No')

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      })
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase() 
    })

    if (existingUser) {
      console.log('❌ User already exists:', email)
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      })
    }

    // Hash password
    console.log('🔐 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log('✅ Password hashed, length:', hashedPassword.length)

    // Create user with EXPLICIT fields
    console.log('👤 Creating user...')
    const newUser = new User({
      name: name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'student',
      provider: 'local',
      avatar: 'https://via.placeholder.com/150'
    })

    // Save
    await newUser.save()
    console.log('✅ User saved to database')

    // Verify password was saved
    const savedUser = await User.findById(newUser._id)
    console.log('🔍 Verification - User has password:', !!savedUser.password)
    console.log('🔍 Password length in DB:', savedUser.password?.length)

    // Generate token
    const token = jwt.sign(
      { 
        id: savedUser._id,
        email: savedUser.email,
        role: savedUser.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    )

    console.log('✅ Registration complete:', savedUser.email)

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        _id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        avatar: savedUser.avatar
      },
      token
    })
  } catch (error) {
    console.error('❌ Registration error:', error)
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    })
  }
})

// ========================
// LOGIN
// ========================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    console.log('🔐 Login attempt:', email)

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      })
    }

    // Find user
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    }).lean().exec()

    if (!user) {
      console.log('❌ User not found:', email)
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    console.log('👤 User found:', user.email)
    console.log('🔑 User has password:', !!user.password)

    // Check if password exists (OAuth users don't have passwords)
    if (!user.password) {
      console.log('❌ OAuth user trying credentials login:', email)
      return res.status(401).json({
        success: false,
        message: 'This account uses Google/Facebook login. Please sign in with the same method you used to create your account.'
      })
    }

    // Compare password
    console.log('🔍 Comparing passwords...')
    const isMatch = await bcrypt.compare(password, user.password)
    console.log('✅ Password match:', isMatch)

    if (!isMatch) {
      console.log('❌ Invalid password for:', email)
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    )

    console.log('✅ Login successful:', email)

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        university: user.university,
        bio: user.bio,
        location: user.location
      },
      token
    })
  } catch (error) {
    console.error('❌ Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    })
  }
})

// ========================
// OAUTH
// ========================
router.post('/oauth', async (req, res) => {
  try {
    const { email, name, avatar, provider, role } = req.body

    console.log('🔐 OAuth attempt:', email, provider)

    // Find or create user
    let user = await User.findOne({ 
      email: email.toLowerCase() 
    }).lean().exec()

    if (!user) {
      // Create new OAuth user (without password)
      user = await User.create({
        name,
        email: email.toLowerCase(),
        avatar,
        role: role || 'student',
        provider
      })
      console.log('✅ OAuth user created:', email)
    } else {
      console.log('✅ OAuth user found:', email)
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    )

    res.json({
      success: true,
      message: 'OAuth successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      token
    })
  } catch (error) {
    console.error('❌ OAuth error:', error)
    res.status(500).json({
      success: false,
      message: 'OAuth failed',
      error: error.message
    })
  }
})

// ========================
// GET PROFILE
// ========================
router.get('/profile', async (req, res) => {
  try {
    const { email } = req.query

    console.log('📡 GET Profile request for:', email)

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      })
    }

    const user = await User.findOne({ 
      email: email.toLowerCase() 
    })
      .select('-password')
      .lean()
      .exec()

    if (!user) {
      console.log('❌ User not found:', email)
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    console.log('✅ Profile fetched:', {
      name: user.name,
      email: user.email,
      role: user.role
    })

    res.json({
      success: true,
      user
    })
  } catch (error) {
    console.error('❌ Get profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    })
  }
})

// ========================
// UPDATE PROFILE
// ========================
router.put('/profile', async (req, res) => {
  try {
    const { email, name, phone, university, bio, location, avatar } = req.body

    console.log('📝 PUT Profile request for:', email)
    console.log('📝 Update data:', { name, phone, university, bio, location, avatar })

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      })
    }

    // Find and update user
    const updatedUser = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          name: name,
          phone: phone,
          university: university,
          bio: bio,
          location: location,
          avatar: avatar,
          updatedAt: new Date()
        }
      },
      { new: true }
    )
      .select('-password')
      .lean()
      .exec()

    if (!updatedUser) {
      console.log('❌ User not found:', email)
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    console.log('✅ Profile updated successfully:', {
      name: updatedUser.name,
      email: updatedUser.email
    })

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('❌ Update profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    })
  }
})

// ========================
// DELETE USER (Development Only)
// ========================
router.delete('/delete-user/:email', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is disabled in production'
      })
    }

    const { email } = req.params
    const result = await User.deleteOne({ email: email.toLowerCase() })
    
    console.log('🗑️ User deleted:', email, result)
    
    res.json({ 
      success: true, 
      message: 'User deleted',
      deletedCount: result.deletedCount
    })
  } catch (error) {
    console.error('❌ Delete error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

export default router