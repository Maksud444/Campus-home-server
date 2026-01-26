import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

// CRITICAL: Same secret as auth.routes.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

console.log('🔑 Auth Middleware - JWT_SECRET loaded:', JWT_SECRET.substring(0, 10) + '...');

export const protect = async (req, res, next) => {
  let token;

  try {
    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔑 Token received:', token.substring(0, 30) + '...');
    }

    // Check if token exists
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    // Verify token
    console.log('🔐 Verifying token with secret:', JWT_SECRET.substring(0, 10) + '...');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token decoded successfully:', decoded);

    // Find user by ID from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      console.log('❌ User not found for ID:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found'
      });
    }

    console.log('✅ User authenticated:', user.email);

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    console.error('Error type:', error.name);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token expired'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

// Role-based authorization
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    
    console.log(`✅ User role '${req.user.role}' authorized`);
    next();
  };
};

export const authorize = restrictTo;