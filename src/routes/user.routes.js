import express from 'express'
import User from '../models/User.model.js'

const router = express.Router()

// Get user profile
// Get Profile
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
      .select('-password') // Don't send password
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

// Update user profile
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

    // Find user first
    const existingUser = await User.findOne({ 
      email: email.toLowerCase() 
    })

    if (!existingUser) {
      console.log('❌ User not found:', email)
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Update fields
    existingUser.name = name || existingUser.name
    existingUser.phone = phone || existingUser.phone
    existingUser.university = university || existingUser.university
    existingUser.bio = bio || existingUser.bio
    existingUser.location = location || existingUser.location
    existingUser.avatar = avatar || existingUser.avatar
    existingUser.updatedAt = new Date()

    // Save
    await existingUser.save()

    console.log('✅ Profile updated successfully:', {
      name: existingUser.name,
      email: existingUser.email
    })

    // Return updated user without password
    const updatedUser = await User.findById(existingUser._id)
      .select('-password')
      .lean()
      .exec()

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

// Update notification preferences
// PUT /api/users/notifications  { email, newListings, locations, types, maxPrice }
router.put('/notifications', async (req, res) => {
  try {
    const { email, newListings, locations, types, maxPrice } = req.body

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    user.notificationPrefs = {
      newListings: newListings ?? user.notificationPrefs?.newListings ?? false,
      locations: locations ?? user.notificationPrefs?.locations ?? [],
      types: types ?? user.notificationPrefs?.types ?? [],
      maxPrice: maxPrice ?? user.notificationPrefs?.maxPrice ?? 0,
    }
    await user.save()

    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: user.notificationPrefs,
    })
  } catch (error) {
    console.error('Update notifications error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Get notification preferences
// GET /api/users/notifications?email=...
router.get('/notifications', async (req, res) => {
  try {
    const { email } = req.query
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' })
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select('notificationPrefs').lean()
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    res.json({ success: true, data: user.notificationPrefs || {} })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

export default router