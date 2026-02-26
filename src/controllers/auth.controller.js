import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'default-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    console.log('📝 Registration Request:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation Errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, password, role, phone, university, agentInfo, ownerInfo } = req.body;

    // CRITICAL: Validate role is provided and valid
    if (!role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please select a role (student, agent, owner, or service-provider)' 
      });
    }

    const validRoles = ['student', 'agent', 'owner', 'service-provider'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // Create user data object
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role,  // ← CRITICAL: Explicitly set role
      phone: phone || '',
      university: university || '',
      authProvider: 'local',
      verified: false
    };

    // Add role-specific info
    if (role === 'agent' && agentInfo) {
      userData.agentInfo = agentInfo;
    }
    if (role === 'owner' && ownerInfo) {
      userData.ownerInfo = ownerInfo;
    }

    console.log('👤 Creating user with data:', {
      email: userData.email,
      role: userData.role,
      name: userData.name
    });

    // Create user
    const user = await User.create(userData);

    console.log('✅ User Created Successfully:', {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        university: user.university
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    console.log('🔐 Login Request:', req.body.email);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Check user exists and select password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if user used social login
    if (user.provider && user.provider !== 'local') {
      return res.status(401).json({
        success: false,
        message: `Please login with ${user.provider}`
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    console.log('✅ Login Successful:', {
      email: user.email,
      role: user.role,
      id: user._id
    });

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        university: user.university
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
export const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    const token = generateToken(user._id);

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?token=${token}`);
  } catch (error) {
    console.error('Google auth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
  }
};

// @desc    Facebook OAuth callback
// @route   GET /api/auth/facebook/callback
// @access  Public
export const facebookAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    const token = generateToken(user._id);

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?token=${token}`);
  } catch (error) {
    console.error('Facebook auth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('savedProperties');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, university, avatar, bio, location, agentInfo, ownerInfo, serviceProviderInfo } = req.body;

    console.log('💾 Updating profile for user:', req.user.id);
    console.log('📥 Update data:', { name, phone, university, avatar });

    const updateData = { 
      name, 
      phone, 
      university, 
      avatar,
      bio,
      location
    };

    // Update role-specific info
    if (req.user.role === 'agent' && agentInfo) {
      updateData.agentInfo = agentInfo;
    }
    if (req.user.role === 'owner' && ownerInfo) {
      updateData.ownerInfo = ownerInfo;
    }
    if (req.user.role === 'service-provider' && serviceProviderInfo) {
      updateData.serviceProviderInfo = serviceProviderInfo;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    console.log('✅ Profile updated successfully');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check if user used social login
    if (user.authProvider !== 'local') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change password for social login accounts'
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};