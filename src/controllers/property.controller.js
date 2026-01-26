import Property from '../models/Property.model.js';

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
export const getAllProperties = async (req, res) => {
  try {
    console.log('📥 GET /api/properties - Fetching properties...');
    
    const {
      location,
      type,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      furnished,
      available,
      verified,
      page = 1,
      limit = 12,
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = {};

    if (location) {
      query.$or = [
        { location: { $regex: location, $options: 'i' } },
        { area: { $regex: location, $options: 'i' } }
      ];
    }

    if (type) query.type = type;
    if (bedrooms) query.bedrooms = Number(bedrooms);
    if (bathrooms) query.bathrooms = Number(bathrooms);
    if (furnished !== undefined) query.furnished = furnished === 'true';
    if (available !== undefined) query.available = available === 'true';
    if (verified !== undefined) query.verified = verified === 'true';

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    console.log('🔍 Query:', JSON.stringify(query));

    // Execute query with pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const properties = await Property.find(query)
      .populate('owner', 'name email phone avatar')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Property.countDocuments(query);

    console.log(`✅ Found ${properties.length} properties (Total: ${total})`);

    res.json({
      success: true,
      properties,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('❌ Error fetching properties:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching properties',
      error: error.message
    });
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
export const getPropertyById = async (req, res) => {
  try {
    console.log('📥 GET /api/properties/:id - Property ID:', req.params.id);

    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email phone avatar role');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    console.log('✅ Property found:', property.title);

    res.json({
      success: true,
      property
    });
  } catch (error) {
    console.error('❌ Error fetching property:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property',
      error: error.message
    });
  }
};

// @desc    Create new property
// @route   POST /api/properties
// @access  Private
export const createProperty = async (req, res) => {
  try {
    console.log('📝 POST /api/properties - Creating property...');
    console.log('User:', req.user.id);

    const propertyData = {
      ...req.body,
      owner: req.user.id
    };

    const property = await Property.create(propertyData);

    console.log('✅ Property created:', property.title);

    res.status(201).json({
      success: true,
      property
    });
  } catch (error) {
    console.error('❌ Error creating property:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating property',
      error: error.message
    });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private
export const updateProperty = async (req, res) => {
  try {
    console.log('✏️ PUT /api/properties/:id - Updating property...');

    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check ownership
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    property = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    console.log('✅ Property updated:', property.title);

    res.json({
      success: true,
      property
    });
  } catch (error) {
    console.error('❌ Error updating property:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating property',
      error: error.message
    });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private
export const deleteProperty = async (req, res) => {
  try {
    console.log('🗑️ DELETE /api/properties/:id - Deleting property...');

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check ownership
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
    }

    await property.deleteOne();

    console.log('✅ Property deleted');

    res.json({
      success: true,
      message: 'Property deleted'
    });
  } catch (error) {
    console.error('❌ Error deleting property:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting property',
      error: error.message
    });
  }
};

// @desc    Get my properties
// @route   GET /api/properties/my/properties
// @access  Private
export const getMyProperties = async (req, res) => {
  try {
    console.log('📥 GET /api/properties/my/properties - User:', req.user.id);

    const properties = await Property.find({ owner: req.user.id })
      .sort('-createdAt');

    console.log(`✅ Found ${properties.length} properties for user`);

    res.json({
      success: true,
      properties
    });
  } catch (error) {
    console.error('❌ Error fetching user properties:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching properties',
      error: error.message
    });
  }
};