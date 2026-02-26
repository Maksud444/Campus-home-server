// Admin Secret Key Middleware
// Every request to admin routes must include the correct secret header.
// This acts as a second lock — even if someone discovers the URL,
// they still cannot access anything without this hidden key.

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY

export const requireAdminSecret = (req, res, next) => {
  const providedKey = req.headers['x-admin-key']

  if (!ADMIN_SECRET_KEY) {
    console.error('❌ ADMIN_SECRET_KEY is not set in environment variables')
    return res.status(500).json({ success: false, message: 'Server configuration error' })
  }

  if (!providedKey || providedKey !== ADMIN_SECRET_KEY) {
    // Return generic 404 so attackers don't know the route exists
    return res.status(404).json({ success: false, message: 'Route not found' })
  }

  next()
}
