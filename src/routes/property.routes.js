import express from 'express'
import Property from '../models/Property.model.js'

const router = express.Router()

// ==================
// CREATE PROPERTY
// ==================
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      location,
      propertyType,
      bedrooms,
      bathrooms,
      area,
      images,
      amenities,
      whatsapp,
      contactPhone,
      contactEmail,
      userId
    } = req.body

    // Validate WhatsApp number
    if (whatsapp && whatsapp.number) {
      if (whatsapp.number.length > 11) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp number cannot be more than 11 digits'
        })
      }
      if (!/^\d{10,11}$/.test(whatsapp.number)) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp number must be 10-11 digits only'
        })
      }
    }

    const property = await Property.create({
      title,
      description,
      price,
      location,
      propertyType,
      bedrooms,
      bathrooms,
      area,
      images,
      amenities,
      whatsapp,
      contactPhone,
      contactEmail,
      userId,
      status: 'available'
    })

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      property
    })
  } catch (error) {
    console.error('❌ Create property error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create property',
      error: error.message
    })
  }
})

// ==================
// GET ALL PROPERTIES (excluding soft deleted)
// ==================
router.get('/', async (req, res) => {
  try {
    const { userId, status } = req.query

    const filter = {
      isDeleted: false // Exclude soft deleted
    }

    if (userId) filter.userId = userId
    if (status) filter.status = status

    const properties = await Property.find(filter)
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean()
      .maxTimeMS(5000)

    res.json({
      success: true,
      properties
    })
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