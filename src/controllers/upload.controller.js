import { uploadToCloudinary } from '../utils/cloudinary.js';
import fs from 'fs';

// @desc    Upload image
// @route   POST /api/upload
// @access  Private
export const uploadImage = async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('📎 File:', req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload to Cloudinary
    console.log('☁️ Uploading to Cloudinary...');
    const result = await uploadToCloudinary(req.file.path);

    console.log('✅ Upload successful:', result.secure_url);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Clean up temp file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
};