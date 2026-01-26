import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '12345',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'secret'
});

// Upload image to Cloudinary
export const uploadToCloudinary = async (filePath) => {
  try {
    console.log('☁️ Uploading to Cloudinary:', filePath);
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'student-housing',
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto' }
      ]
    });

    console.log('✅ Cloudinary upload successful');

    // Delete local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Local file deleted');
    }

    return result;
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    
    // Delete local file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    throw error;
  }
};

// Delete image from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('🗑️ Cloudinary delete result:', result);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    return null;
  }
};

export default cloudinary;