import express from 'express';
import Property from '../models/Property.model.js';

const router = express.Router();

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('📥 GET /api/properties - Fetching properties...');
    
    const { type } = req.query;
    
    const query = { status: 'active' };
    if (type && type !== 'all') {
      query.type = type;
    }

    const properties = await Property.find(query).sort({ createdAt: -1 });

    console.log(`✅ Found ${properties.length} properties`);

    res.json({
      success: true,
      properties: properties
    });
  } catch (error) {
    console.error('❌ Error fetching properties:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    console.log('📥 GET /api/properties/:id - Property ID:', req.params.id);
    
    const property = await Property.findById(req.params.id);

    if (!property || property.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Increment views
    property.views += 1;
    await property.save();

    console.log('✅ Property found:', property.title);

    res.json({
      success: true,
      property: property
    });
  } catch (error) {
    console.error('❌ Error fetching property:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create property
// @route   POST /api/properties
// @access  Public (NO AUTHENTICATION REQUIRED)
router.post('/', async (req, res) => {
  try {
    console.log('📝 POST /api/properties - Creating property...');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      title,
      description,
      type,
      price,
      location,
      city,
      selectedArea,
      addressDetails,
      whatsappNumber,
      bedrooms,
      bathrooms,
      area,
      propertyType,
      furnished,
      amenities,
      images,
      videos,
      preferences,
      targetAudience,
      userName,
      userEmail,
      userId,
      userImage,
      userRole
    } = req.body;

    const newProperty = new Property({
      userId,
      userName,
      userEmail,
      userImage,
      userRole,
      title,
      description,
      type,
      price,
      location,
      city,
      selectedArea,
      addressDetails,
      whatsappNumber,
      bedrooms,
      bathrooms,
      area,
      propertyType,
      furnished,
      amenities,
      images,
      videos,
      preferences,
      targetAudience
    });

    const savedProperty = await newProperty.save();

    console.log('✅ Property created:', savedProperty.title);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      property: savedProperty
    });
  } catch (error) {
    console.error('❌ Error creating property:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create property',
      error: error.message
    });
  }
});

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    console.log('✏️ PUT /api/properties/:id - Updating property...');
    
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    console.log('✅ Property updated:', updatedProperty.title);

    res.json({
      success: true,
      message: 'Property updated successfully',
      property: updatedProperty
    });
  } catch (error) {
    console.error('❌ Error updating property:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property',
      error: error.message
    });
  }
});

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ DELETE /api/properties/:id - Deleting property...');
    
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    property.status = 'deleted';
    await property.save();

    console.log('✅ Property deleted');

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting property:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete property',
      error: error.message
    });
  }
});

// @desc    Like/Unlike property
// @route   POST /api/properties/:id/like
// @access  Public
router.post('/:id/like', async (req, res) => {
  try {
    console.log('❤️ POST /api/properties/:id/like - Toggling like...');
    
    const { userId, userName } = req.body;
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const likeIndex = property.likes.findIndex(like => like.userId === userId);

    if (likeIndex > -1) {
      // Unlike
      property.likes.splice(likeIndex, 1);
      console.log('👎 Unliked property');
    } else {
      // Like
      property.likes.push({ userId, userName });
      console.log('👍 Liked property');
    }

    await property.save();

    res.json({
      success: true,
      property: {
        likes: property.likes
      }
    });
  } catch (error) {
    console.error('❌ Error liking property:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like property',
      error: error.message
    });
  }
});

export default router;