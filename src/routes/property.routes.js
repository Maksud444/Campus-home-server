import express from 'express'
import Property from '../models/Property.model.js'
import User from '../models/User.model.js'
import { buildRankingPipeline } from '../utils/rankingPipeline.js'

const router = express.Router()

// ==================
// CREATE PROPERTY
// ==================
router.post('/', async (req, res) => {
  try {
    console.log('📥 Create property request')
    console.log('📦 Body:', JSON.stringify(req.body, null, 2))
    console.log('💰 Raw price from frontend:', req.body.price, 'Type:', typeof req.body.price)


    const {
      title,
      description,
      type,
      price,
      location,
      propertyType,
      bedrooms,
      bathrooms,
      area,
      furnished,
      images,
      videos,
      amenities,
      preferences,
      targetAudience,
      whatsapp,
      contactPhone,
      contactEmail,
      userId,
      userName,
      userEmail,
      userImage,
      userRole
    } = req.body

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      })
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      })
    }

    if (!location || !location.city) {
      return res.status(400).json({
        success: false,
        message: 'City is required'
      })
    }

    if (!location.area) {
      return res.status(400).json({
        success: false,
        message: 'Area is required'
      })
    }

    if (!whatsapp || !whatsapp.number) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp number is required'
      })
    }

    // Validate WhatsApp number
    if (whatsapp.number.length < 10 || whatsapp.number.length > 11) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp number must be 10-11 digits'
      })
    }

    if (!/^\d{10,11}$/.test(whatsapp.number)) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp number must contain only digits'
      })
    }

    if (!images || images.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'At least 3 images are required'
      })
    }

    // Find user if userId provided
    let user = null
    if (userId) {
      try {
        user = await User.findById(userId)
      } catch (err) {
        console.log('⚠️ Invalid userId format:', userId)
      }
    }

    // Create property
    const propertyData = {
      title: title.trim(),
      description: description.trim(),
      type: type || 'property',
      price: price !== null && price !== undefined && price !== '' ? Number(price) : null,
      location: {
        city: location.city,
        area: location.area,
        address: location.address || ''
      },
      propertyType: propertyType || 'apartment',
      bedrooms: bedrooms ? parseInt(bedrooms) : null,
      bathrooms: bathrooms ? parseInt(bathrooms) : null,
      area: area ? parseFloat(area) : null,
      furnished: furnished === true || furnished === 'true',
      images: images || [],
      videos: videos || [],
      amenities: amenities || [],
      preferences: preferences || '',
      targetAudience: targetAudience || 'students',
      whatsapp: {
        countryCode: whatsapp.countryCode || '+20',
        number: whatsapp.number
      },
      contactPhone: contactPhone || '',
      contactEmail: contactEmail || '',
      status: 'pending'
    }

    // Add user info
    if (user) {
      propertyData.userId = user._id
      propertyData.userName = user.name
      propertyData.userEmail = user.email
      propertyData.userImage = user.avatar || ''
      propertyData.userRole = user.role
    } else {
      // Use provided user info
      propertyData.userName = userName || 'Anonymous'
      propertyData.userEmail = userEmail || ''
      propertyData.userImage = userImage || ''
      propertyData.userRole = userRole || 'student'
    }

    console.log('📝 Creating property:', propertyData.title)

    console.log('📝 Creating property:', propertyData.title)
    
    // ADD THIS NEW LINE:
    console.log('💰 Final price value:', propertyData.price, 'Type:', typeof propertyData.price)

    const property = await Property.create(propertyData)

    console.log('✅ Property created:', property._id)

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      property
    })

  } catch (error) {
    console.error('❌ Create property error:', error)
    console.error('Error stack:', error.stack)
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create property',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// ==================
// GET ALL PROPERTIES (excluding soft deleted)
// ==================
router.get('/', async (req, res) => {
  try {
    const {
      userId,
      status,
      city,
      area,
      type,
      propertyType,
      minPrice,
      maxPrice,
      page = 1,
      limit = 50,
    } = req.query

    // Owner view: skip ranking, show all their own listings sorted by date
    if (userId) {
      const filter = { isDeleted: false, userId }
      if (status) filter.status = status

      const properties = await Property.find(filter)
        .populate('userId', 'name email avatar')
        .sort({ createdAt: -1 })
        .lean()
        .maxTimeMS(5000)

      return res.json({ success: true, properties })
    }

    // Public view: ranked listing of active properties
    const matchFilter = { isDeleted: false, status: 'active' }

    if (city)        matchFilter['location.city'] = { $regex: city, $options: 'i' }
    if (area)        matchFilter['location.area'] = { $regex: area, $options: 'i' }
    if (type)        matchFilter.type = type
    if (propertyType) matchFilter.propertyType = propertyType

    if (minPrice || maxPrice) {
      matchFilter.price = {}
      if (minPrice) matchFilter.price.$gte = Number(minPrice)
      if (maxPrice) matchFilter.price.$lte = Number(maxPrice)
    }

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit))
    const lim  = Math.min(100, Number(limit))

    const pipeline = buildRankingPipeline(matchFilter, { skip, limit: lim })
    const properties = await Property.aggregate(pipeline).option({ maxTimeMS: 10000 })

    res.json({ success: true, properties })
  } catch (error) {
    console.error('❌ Get properties error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties',
      error: error.message
    })
  }
})

// ==================
// GET SINGLE PROPERTY
// ==================
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('userId', 'name email avatar phone')
      .lean()

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      })
    }

    // Show deleted properties with special message
    if (property.isDeleted) {
      return res.status(410).json({
        success: false,
        message: 'This property is no longer available',
        isDeleted: true,
        deletedAt: property.deletedAt
      })
    }

    res.json({
      success: true,
      property
    })
  } catch (error) {
    console.error('❌ Get property error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property',
      error: error.message
    })
  }
})

// ==================
// UPDATE PROPERTY
// ==================
router.put('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      })
    }

    if (property.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update deleted property'
      })
    }

    // Validate WhatsApp number if provided
    if (req.body.whatsapp && req.body.whatsapp.number) {
      if (req.body.whatsapp.number.length > 11) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp number cannot be more than 11 digits'
        })
      }
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean()

    res.json({
      success: true,
      message: 'Property updated successfully',
      property: updatedProperty
    })
  } catch (error) {
    console.error('❌ Update property error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update property',
      error: error.message
    })
  }
})

// ==================
// SOFT DELETE PROPERTY
// ==================
router.delete('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      })
    }

    if (property.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Property is already deleted'
      })
    }

    // Soft delete
    await property.softDelete()

    res.json({
      success: true,
      message: 'Property deleted. It will be permanently removed in 2 days.',
      deletedAt: property.deletedAt,
      permanentDeleteAt: property.permanentDeleteAt
    })
  } catch (error) {
    console.error('❌ Delete property error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete property',
      error: error.message
    })
  }
})

// ==================
// RESTORE DELETED PROPERTY
// ==================
router.post('/:id/restore', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      })
    }

    if (!property.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Property is not deleted'
      })
    }

    // Restore
    await property.restore()

    res.json({
      success: true,
      message: 'Property restored successfully',
      property
    })
  } catch (error) {
    console.error('❌ Restore property error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to restore property',
      error: error.message
    })
  }
})

// ==================
// GET USER'S DELETED PROPERTIES
// ==================
router.get('/user/:userId/deleted', async (req, res) => {
  try {
    const deletedProperties = await Property.find({
      userId: req.params.userId,
      isDeleted: true
    })
      .sort({ deletedAt: -1 })
      .lean()

    res.json({
      success: true,
      properties: deletedProperties
    })
  } catch (error) {
    console.error('❌ Get deleted properties error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deleted properties',
      error: error.message
    })
  }
})

export default router