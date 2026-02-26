import express from 'express'
import { protect, restrictTo } from '../middleware/auth.middleware.js'
import { requireAdminSecret } from '../middleware/adminSecret.middleware.js'
import {
  getAdminDashboard,
  getPlatformStats,
  // User management
  getAllUsers,
  getUserById,
  updateUser,
  updateUserRole,
  banUser,
  unbanUser,
  deleteUser,
  // Post management
  getAllPosts,
  getPostById,
  approvePost,
  rejectPost,
  deletePost,
  // Property management
  getAllProperties,
  toggleFeaturedProperty,
  toggleVerifiedProperty,
  deleteProperty,
  // Email marketing
  broadcastEmail,
  getEmailStats,
} from '../controllers/admin.controller.js'

const router = express.Router()

// All admin routes require:
//  1. Secret header (X-Admin-Key) — hidden key from .env
//  2. Valid JWT token
//  3. Admin role
router.use(requireAdminSecret)
router.use(protect)
router.use(restrictTo('admin'))

// ── Dashboard ──────────────────────────────────────
router.get('/dashboard', getAdminDashboard)
router.get('/stats', getPlatformStats)

// ── User Management ────────────────────────────────
router.get('/users', getAllUsers)
router.get('/users/:id', getUserById)
router.put('/users/:id', updateUser)          // frontend: PUT /api/admin/users/:id
router.put('/users/:id/role', updateUserRole) // specific role-only update
router.put('/users/:id/ban', banUser)
router.put('/users/:id/unban', unbanUser)
router.delete('/users/:id', deleteUser)

// ── Post Management ────────────────────────────────
router.get('/posts', getAllPosts)
router.get('/posts/:id', getPostById)
router.put('/posts/:id/approve', approvePost)
router.put('/posts/:id/reject', rejectPost)
router.delete('/posts/:id', deletePost)

// ── Property Management ────────────────────────────
router.get('/properties', getAllProperties)
router.put('/properties/:id/feature', toggleFeaturedProperty)
router.put('/properties/:id/verify', toggleVerifiedProperty)
router.delete('/properties/:id', deleteProperty)

// ── Email Marketing ─────────────────────────────────
router.get('/email/stats', getEmailStats)
router.post('/email/broadcast', broadcastEmail)

export default router
