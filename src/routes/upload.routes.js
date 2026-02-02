import express from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// Memory storage for Vercel
const storage = multer.memoryStorage()

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only images are allowed'))
    }
  }
})

// Upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Upload request received')
    
    if (!req.file) {
      console.log('❌ No file in request')
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    console.log('📁 File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    })

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64')
    const dataURI = `data:${req.file.mimetype};base64,${b64}`

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'campus-egypt',
      resource_type: 'auto'
    })

    console.log('✅ Upload successful:', result.secure_url)

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    })

  } catch (error) {
    console.error('❌ Upload error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    })
  }
})

export default router