import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.model.js'
import { checkConnection } from '../middleware/checkConnection.js'

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      })
    }

    // Hash password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10
    const hashedPassword = await bcrypt.hash(password, bcryptRounds)

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || '',
      role: role || 'student',
      provider: 'local'
    })

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      token
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user and include password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Check if user registered with OAuth
    if (user.provider !== 'local' || !user.password) {
      return res.status(401).json({
        success: false,
        message: `This account is registered with ${user.provider}. Please use ${user.provider} to login.`
      })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        university: user.university,
        bio: user.bio
      },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    })
  }
})

// OAuth (Google/Facebook) - UPDATED VERSION
router.post('/oauth', async (req, res) => {
  try {
    console.log('📥 OAuth request received:', req.body)
    
    const { email, name, image, provider } = req.body

    if (!email) {
      console.error('❌ No email provided')
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      })
    }

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      // Create new user via OAuth
      console.log('🆕 Creating new OAuth user:', email)
      
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        avatar: image || '',
        provider: provider || 'google',
        role: 'student',
        verified: true,
        // Random password (won't be used for OAuth accounts)
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10)
      })
      
      console.log('✅ New user created via OAuth')
    } else {
      // Update existing user's info
      console.log('✅ Existing user found, updating:', email)
      
      if (name) user.name = name
      if (image) user.avatar = image
      if (provider && !user.provider) user.provider = provider
      
      await user.save()
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    console.log('✅ OAuth successful for:', user.email)

    // Return consistent user object format
    res.json({
      success: true,
      user: {
        _id: user._id,
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone || '',
        location: user.location || '',
        university: user.university || '',
        bio: user.bio || ''
      },
      token
    })

  } catch (error) {
    console.error('❌ OAuth error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'OAuth authentication failed',
      error: error.message
    })
  }
})

// GET profile
router.get('/profile', async (req, res) => {
  try {
    const { email, id } = req.query

    console.log('📥 Profile fetch request:', { email, id })

    if (!email && !id) {
      return res.status(400).json({
        success: false,
        message: 'Email or ID is required'
      })
    }

    // Try to find by email first, then by id
    let user = null
    
    if (email) {
      user = await User.findOne({ email }).select('-password').lean()
    }
    
    if (!user && id) {
      user = await User.findById(id).select('-password').lean()
    }

    if (!user) {
      console.log('❌ User not found with email:', email, 'or id:', id)
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    console.log('✅ User found:', user.email)

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Pragma', 'no-cache')

    res.json({
      success: true,
      user
    })
  } catch (error) {
    console.error('❌ Profile fetch error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    })
  }
})

// PUT update profile
router.put('/profile', async (req, res) => {
  try {
    const { email, name, phone, location, university, bio, avatar } = req.body

    console.log('📥 Update profile request:', { email, name })

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      })
    }

    // Find user
    const user = await User.findOne({ email })

    if (!user) {
      console.log('❌ User not found:', email)
      
      // List all users for debugging (remove in production)
      const allUsers = await User.find({}, 'email name').limit(5).lean()
      console.log('📋 Existing users:', allUsers)
      
      return res.status(404).json({
        success: false,
        message: 'User not found',
        debug: {
          searchedEmail: email,
          existingUsers: allUsers.map(u => u.email)
        }
      })
    }

    console.log('✅ User found, updating...')

    // Update fields
    if (name) user.name = name.trim()
    if (phone !== undefined) user.phone = phone
    if (location !== undefined) user.location = location
    if (university !== undefined) user.university = university
    if (bio !== undefined) user.bio = bio
    if (avatar) user.avatar = avatar

    await user.save()

    console.log('✅ Profile updated successfully')

    const updatedUser = await User.findById(user._id).select('-password').lean()

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

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account exists, a password reset link has been sent'
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    user.resetPasswordToken = hashedToken
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000 // 30 minutes
    await user.save()

    // TODO: Send email with reset link
    console.log('Reset token:', resetToken)
    console.log('Reset link:', `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`)

    res.json({
      success: true,
      message: 'Password reset link sent to email',
      // For development only - remove in production
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to process request'
    })
  }
})

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      })
    }

    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      })
    }

    // Hash new password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10
    user.password = await bcrypt.hash(password, bcryptRounds)
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()

    res.json({
      success: true,
      message: 'Password reset successful'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    })
  }
})

export default router