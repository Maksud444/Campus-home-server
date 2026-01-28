// src/routes/auth.routes.js
import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { protect } from '../middleware/auth.middleware.js';
import passport from 'passport';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

console.log('🔑 JWT_SECRET loaded:', JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : 'NOT SET');

// Generate JWT token
const generateToken = (id) => {
  console.log('🎫 Generating token for user ID:', id);
  console.log('🔑 Using JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');
  
  const token = jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d'
  });
  
  console.log('✅ Token generated:', token.substring(0, 30) + '...');
  return token;
};

// ============================================
// DEBUG ENDPOINT (Remove in production!)
// ============================================
router.post('/debug-token', (req, res) => {
  try {
    const { token } = req.body;
    
    console.log('🔍 DEBUG: Token verification test');
    console.log('📝 Token received:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');
    console.log('🔑 Server JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');
    
    if (!token) {
      return res.json({
        success: false,
        message: 'No token provided',
        secretPresent: !!JWT_SECRET,
        secretPreview: JWT_SECRET.substring(0, 10) + '...'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token is VALID');
      console.log('📦 Decoded payload:', decoded);
      
      return res.json({
        success: true,
        message: 'Token is valid!',
        decoded: decoded,
        secretPresent: !!JWT_SECRET
      });
    } catch (err) {
      console.log('❌ Token verification FAILED:', err.message);
      
      return res.json({
        success: false,
        message: 'Token is INVALID',
        error: err.message,
        errorType: err.name,
        secretPresent: !!JWT_SECRET
      });
    }
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// REGISTER
// ============================================
router.post('/register', [
  body('name').trim().notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, phone, university } = req.body;

    console.log('📝 Registration attempt:', { email, role });

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      phone,
      university,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=219ebc&color=fff`
    });

    console.log('✅ User created:', { id: user._id, email: user.email, role: user.role });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        university: user.university,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// ============================================
// LOGIN
// ============================================
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    console.log('🔐 Login attempt:', email);

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    console.log('✅ Login successful:', { id: user._id, role: user.role });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        university: user.university,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ============================================
// OAUTH LOGIN/REGISTER
// ============================================
router.post('/oauth', async (req, res) => {
  try {
    const { email, name, avatar, provider, providerId, role } = req.body;

    if (!email || !name || !provider || !providerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    console.log('🔐 OAuth login attempt:', { email, provider });

    let user = await User.findOne({ email });

    if (user) {
      console.log('✅ Existing user found');
      
      if (!user.oauthProviders) {
        user.oauthProviders = [];
      }

      const providerExists = user.oauthProviders.find(
        p => p.provider === provider && p.providerId === providerId
      );

      if (!providerExists) {
        user.oauthProviders.push({ provider, providerId });
      }

      if (!user.avatar || user.avatar.includes('ui-avatars.com')) {
        user.avatar = avatar || user.avatar;
      }

      user.isVerified = true;
      await user.save();
    } else {
      console.log('📝 Creating new OAuth user');
      
      user = await User.create({
        name,
        email,
        role: role || 'student',
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        password: Math.random().toString(36).slice(-12),
        oauthProviders: [{ provider, providerId }],
        isVerified: true
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('❌ OAuth error:', error);
    res.status(500).json({ success: false, message: 'OAuth failed' });
  }
});

// ============================================
// GET PROFILE (Protected)
// ============================================
router.get('/profile', protect, async (req, res) => {
  try {
    console.log('👤 Get profile for user:', req.user.id);
    
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('✅ Profile retrieved:', user.email);

    res.json({ success: true, user });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
});

// ============================================
// UPDATE PROFILE (Protected)
// ============================================
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, university, bio, avatar, location } = req.body;
    
    console.log('💾 Update profile for user:', req.user.id);
    console.log('📝 Update data:', { name, phone, university });
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (university !== undefined) user.university = university;
    if (bio !== undefined) user.bio = bio;
    if (avatar) user.avatar = avatar;
    if (location !== undefined) user.location = location;

    await user.save();

    console.log('✅ Profile updated successfully');

    res.json({
      success: true,
      message: 'Profile updated',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        university: user.university,
        bio: user.bio,
        location: user.location
      }
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// ============================================
// GOOGLE OAUTH ROUTES
// ============================================
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
}))

router.get('/callback/google', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=auth_failed` 
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user._id)
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`)
    } catch (error) {
      res.redirect(`${FRONTEND_URL}/login?error=token_generation_failed`)
    }
  }
)

// ============================================
// FACEBOOK OAUTH ROUTES
// ============================================
router.get('/facebook', passport.authenticate('facebook', { 
  scope: ['email'],
  session: false 
}))

router.get('/callback/facebook',
  passport.authenticate('facebook', { 
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=auth_failed` 
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user._id)
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`)
    } catch (error) {
      res.redirect(`${FRONTEND_URL}/login?error=token_generation_failed`)
    }
  }
)

export default router;