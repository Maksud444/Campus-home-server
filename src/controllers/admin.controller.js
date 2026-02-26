import User from '../models/User.model.js'
import Property from '../models/Property.model.js'
import Post from '../models/Post.model.js'
import Booking from '../models/Booking.model.js'
import Service from '../models/Service.model.js'
import { sendPostApprovedEmail, sendPostRejectedEmail } from '../utils/email.service.js'

// ─────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────

// @desc    Get admin dashboard with full stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
export const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalAgents,
      totalOwners,
      totalServiceProviders,
      bannedUsers,
      totalProperties,
      activeProperties,
      deletedProperties,
      totalPosts,
      pendingPosts,
      activePosts,
      rejectedPosts,
      totalBookings,
      totalServices,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'agent' }),
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'service-provider' }),
      User.countDocuments({ isBanned: true }),
      Property.countDocuments(),
      Property.countDocuments({ isDeleted: false, status: 'active' }),
      Property.countDocuments({ isDeleted: true }),
      Post.countDocuments({ status: { $ne: 'deleted' } }),
      Post.countDocuments({ status: 'pending' }),
      Post.countDocuments({ status: 'active' }),
      Post.countDocuments({ status: 'rejected' }),
      Booking.countDocuments(),
      Service.countDocuments(),
    ])

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role avatar verified isBanned createdAt')

    const recentPosts = await Post.find({ status: { $ne: 'deleted' } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title type status userName userEmail createdAt')

    const pendingPostsList = await Post.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title type status userName userEmail createdAt')

    res.json({
      success: true,
      data: {
        stats: {
          users: {
            total: totalUsers,
            students: totalStudents,
            agents: totalAgents,
            owners: totalOwners,
            serviceProviders: totalServiceProviders,
            banned: bannedUsers,
          },
          properties: {
            total: totalProperties,
            active: activeProperties,
            deleted: deletedProperties,
          },
          posts: {
            total: totalPosts,
            pending: pendingPosts,
            active: activePosts,
            rejected: rejectedPosts,
          },
          bookings: { total: totalBookings },
          services: { total: totalServices },
        },
        recentUsers,
        recentPosts,
        pendingPostsList,
      },
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────

// @desc    Get all users with filters & pagination
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search,
      isBanned,
      sort = '-createdAt',
    } = req.query

    const filter = {}
    if (role) filter.role = role
    if (isBanned !== undefined) filter.isBanned = isBanned === 'true'
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .select('-password -resetPasswordToken -resetPasswordExpire'),
      User.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    })
  } catch (error) {
    console.error('Get all users error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-password -resetPasswordToken -resetPasswordExpire'
    )

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Get user's posts and properties count
    const [postsCount, propertiesCount] = await Promise.all([
      Post.countDocuments({ userId: req.params.id }),
      Property.countDocuments({ userId: req.params.id }),
    ])

    res.json({
      success: true,
      data: { user, postsCount, propertiesCount },
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Update user (role, verified, etc.) — used by frontend PUT /api/admin/users/:id
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  try {
    const allowedRoles = ['student', 'agent', 'owner', 'service-provider', 'admin']
    const { role, verified, name, phone } = req.body

    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot edit your own account from here',
      })
    }

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}`,
      })
    }

    const updateData = {}
    if (role !== undefined) updateData.role = role
    if (verified !== undefined) updateData.verified = verified
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password')

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Update user role only
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body
    const allowedRoles = ['student', 'agent', 'owner', 'service-provider', 'admin']

    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}`,
      })
    }

    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role',
      })
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password')

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({
      success: true,
      message: `User role updated to '${role}'`,
      data: { user },
    })
  } catch (error) {
    console.error('Update user role error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Ban user
// @route   PUT /api/admin/users/:id/ban
// @access  Private (Admin)
export const banUser = async (req, res) => {
  try {
    const { reason = '' } = req.body

    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot ban yourself',
      })
    }

    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (user.isBanned) {
      return res.status(400).json({ success: false, message: 'User is already banned' })
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot ban another admin' })
    }

    user.isBanned = true
    user.banReason = reason
    await user.save()

    res.json({
      success: true,
      message: 'User banned successfully',
      data: { userId: user._id, isBanned: true, banReason: reason },
    })
  } catch (error) {
    console.error('Ban user error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Unban user
// @route   PUT /api/admin/users/:id/unban
// @access  Private (Admin)
export const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (!user.isBanned) {
      return res.status(400).json({ success: false, message: 'User is not banned' })
    }

    user.isBanned = false
    user.banReason = ''
    await user.save()

    res.json({
      success: true,
      message: 'User unbanned successfully',
      data: { userId: user._id, isBanned: false },
    })
  } catch (error) {
    console.error('Unban user error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Delete user (permanent)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      })
    }

    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete another admin' })
    }

    // Soft delete all user's posts
    await Post.updateMany(
      { userId: req.params.id },
      { status: 'deleted' }
    )

    // Soft delete all user's properties
    await Property.updateMany(
      { userId: req.params.id },
      { isDeleted: true, deletedAt: new Date() }
    )

    await User.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'User and their content deleted successfully',
    })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────
// POST MANAGEMENT
// ─────────────────────────────────────────────────

// @desc    Get all posts with filters & pagination
// @route   GET /api/admin/posts
// @access  Private (Admin)
export const getAllPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      search,
      sort = '-createdAt',
    } = req.query

    const filter = {}
    if (status) filter.status = status
    if (type) filter.type = type
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Post.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    })
  } catch (error) {
    console.error('Get all posts error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Get single post
// @route   GET /api/admin/posts/:id
// @access  Private (Admin)
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' })
    }

    res.json({ success: true, data: { post } })
  } catch (error) {
    console.error('Get post error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Approve post
// @route   PUT /api/admin/posts/:id/approve
// @access  Private (Admin)
export const approvePost = async (req, res) => {
  try {
    const { note = '' } = req.body

    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' })
    }

    if (post.status === 'deleted') {
      return res.status(400).json({ success: false, message: 'Cannot approve a deleted post' })
    }

    post.status = 'active'
    post.adminNote = note
    post.approvedBy = req.user._id
    post.approvedAt = new Date()
    await post.save()

    // Send email notification to post owner (non-blocking)
    try {
      const postOwner = await User.findOne({
        $or: [{ _id: post.userId }, { email: post.userId }]
      }).select('name email')
      if (postOwner?.email) {
        await sendPostApprovedEmail({
          to: postOwner.email,
          userName: postOwner.name || 'User',
          postTitle: post.title || 'Your post',
          postId: post._id,
          adminNote: note,
        })
      }
    } catch (emailErr) {
      console.error('Email notification failed (non-critical):', emailErr.message)
    }

    res.json({
      success: true,
      message: 'Post approved successfully',
      data: { postId: post._id, status: post.status },
    })
  } catch (error) {
    console.error('Approve post error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Reject post
// @route   PUT /api/admin/posts/:id/reject
// @access  Private (Admin)
export const rejectPost = async (req, res) => {
  try {
    const { note = '' } = req.body

    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' })
    }

    if (post.status === 'deleted') {
      return res.status(400).json({ success: false, message: 'Cannot reject a deleted post' })
    }

    post.status = 'rejected'
    post.adminNote = note
    post.approvedBy = req.user._id
    post.approvedAt = new Date()
    await post.save()

    // Send email notification to post owner (non-blocking)
    try {
      const postOwner = await User.findOne({
        $or: [{ _id: post.userId }, { email: post.userId }]
      }).select('name email')
      if (postOwner?.email) {
        await sendPostRejectedEmail({
          to: postOwner.email,
          userName: postOwner.name || 'User',
          postTitle: post.title || 'Your post',
          adminNote: note,
        })
      }
    } catch (emailErr) {
      console.error('Email notification failed (non-critical):', emailErr.message)
    }

    res.json({
      success: true,
      message: 'Post rejected',
      data: { postId: post._id, status: post.status },
    })
  } catch (error) {
    console.error('Reject post error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Delete post (permanent)
// @route   DELETE /api/admin/posts/:id
// @access  Private (Admin)
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' })
    }

    await Post.findByIdAndDelete(req.params.id)

    res.json({ success: true, message: 'Post permanently deleted' })
  } catch (error) {
    console.error('Delete post error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────
// PROPERTY MANAGEMENT
// ─────────────────────────────────────────────────

// @desc    Get all properties with filters & pagination
// @route   GET /api/admin/properties
// @access  Private (Admin)
export const getAllProperties = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      search,
      isDeleted,
      sort = '-createdAt',
    } = req.query

    const filter = {}
    if (status) filter.status = status
    if (type) filter.type = type
    if (isDeleted !== undefined) filter.isDeleted = isDeleted === 'true'
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .populate('userId', 'name email avatar role')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Property.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: {
        properties,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    })
  } catch (error) {
    console.error('Get all properties error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Toggle featured property
// @route   PUT /api/admin/properties/:id/feature
// @access  Private (Admin)
export const toggleFeaturedProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' })
    }

    property.featured = !property.featured
    await property.save()

    res.json({
      success: true,
      message: `Property ${property.featured ? 'marked as featured' : 'removed from featured'}`,
      data: { propertyId: property._id, featured: property.featured },
    })
  } catch (error) {
    console.error('Toggle featured error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Toggle property verified
// @route   PUT /api/admin/properties/:id/verify
// @access  Private (Admin)
export const toggleVerifiedProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' })
    }

    property.verified = !property.verified
    await property.save()

    res.json({
      success: true,
      message: `Property ${property.verified ? 'verified' : 'unverified'}`,
      data: { propertyId: property._id, verified: property.verified },
    })
  } catch (error) {
    console.error('Toggle verified error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @desc    Hard delete property
// @route   DELETE /api/admin/properties/:id
// @access  Private (Admin)
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' })
    }

    await Property.findByIdAndDelete(req.params.id)

    res.json({ success: true, message: 'Property permanently deleted' })
  } catch (error) {
    console.error('Delete property error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────
// OVERVIEW STATS
// ─────────────────────────────────────────────────

// @desc    Get detailed platform stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getPlatformStats = async (req, res) => {
  try {
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      newUsersLast7,
      newUsersLast30,
      newPostsLast7,
      newPostsLast30,
      newPropertiesLast7,
      newPropertiesLast30,
      usersByRole,
      postsByStatus,
      postsByType,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: last7Days } }),
      User.countDocuments({ createdAt: { $gte: last30Days } }),
      Post.countDocuments({ createdAt: { $gte: last7Days } }),
      Post.countDocuments({ createdAt: { $gte: last30Days } }),
      Property.countDocuments({ createdAt: { $gte: last7Days } }),
      Property.countDocuments({ createdAt: { $gte: last30Days } }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Post.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Post.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ])

    res.json({
      success: true,
      data: {
        growth: {
          users: { last7Days: newUsersLast7, last30Days: newUsersLast30 },
          posts: { last7Days: newPostsLast7, last30Days: newPostsLast30 },
          properties: { last7Days: newPropertiesLast7, last30Days: newPropertiesLast30 },
        },
        breakdowns: {
          usersByRole: Object.fromEntries(usersByRole.map(r => [r._id, r.count])),
          postsByStatus: Object.fromEntries(postsByStatus.map(r => [r._id, r.count])),
          postsByType: Object.fromEntries(postsByType.map(r => [r._id, r.count])),
        },
      },
    })
  } catch (error) {
    console.error('Platform stats error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}
