import express from 'express'
import multer from 'multer'
import cloudinary from 'cloudinary'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// Use memory storage for Vercel (no file system)
const storage = multer.memoryStorage()

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only images allowed'))
    }
  }
})

// Upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    // Upload to Cloudinary from buffer
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        {
          folder: 'campus-egypt',
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      
      uploadStream.end(req.file.buffer)
    })

    const result = await uploadPromise

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    })

  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    })
  }
})

export default router
