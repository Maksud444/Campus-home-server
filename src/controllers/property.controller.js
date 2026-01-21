import Property from '../models/Property.model.js';
import User from '../models/User.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
export const getAllProperties = async (req, res) => {
  try {
    const { 
      type, 
      city, 
      minPrice, 
      maxPrice, 
      bedrooms, 
      furnished,
      ownerType,
      search,
      page = 1,
      limit = 12 
    } = req.query;

    // Build query - only show active properties to public
    const query = { status: 'active' };

    if (type) query.type = type;
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (bedrooms) query.bedrooms = parseInt(bedrooms);
    if (furnished !== undefined) query.furnished = furnished === 'true';
    if (ownerType) query.ownerType = ownerType;
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Execute query
    const properties = await Property.find(query)
      .populate('owner', 'name email phone avatar role agentInfo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Property.countDocuments(query);

    res.json({
      success: true,
      properties,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get property by ID
// @route   GET /api/properties/:id
// @access  Public
export const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email phone avatar role agentInfo ownerInfo')
      .populate('reviews.user', 'name avatar');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Increment views
    property.views += 1;
    await property.save();

    res.json({
      success: true,
      property
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create property
// @route   POST /api/properties
// @access  Private (Student, Agent, Owner)
export const createProperty = async (req, res) => {
  try {
    const propertyData = req.body;
    propertyData.owner = req.user.id;
    propertyData.ownerType = req.user.role;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageUploads = await Promise.all(
        req.files.map(file => uploadToCloudinary(file.path))
      );
      propertyData.images = imageUploads.map(upload => ({
        url: upload.secure_url,
        publicId: upload.public_id
      }));
    }

    // Set default status based on role
    if (req.user.role === 'student') {
      propertyData.status = 'pending'; // Needs admin approval
    } else if (req.user.role === 'agent' || req.user.role === 'owner') {
      propertyData.status = 'active'; // Auto-approved for agents and owners
    }

    const property = await Property.create(propertyData);

    await property.populate('owner', 'name email phone avatar');

    res.status(201).json({
      success: true,
      property,
      message: req.user.role === 'student' 
        ? 'Property submitted for approval' 
        : 'Property created successfully'
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Owner of property)
export const updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Check ownership
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const imageUploads = await Promise.all(
        req.files.map(file => uploadToCloudinary(file.path))
      );
      const newImages = imageUploads.map(upload => ({
        url: upload.secure_url,
        publicId: upload.public_id
      }));
      req.body.images = [...(property.images || []), ...newImages];
    }

    property = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('owner', 'name email phone avatar');

    res.json({
      success: true,
      property
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Owner of property)
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Check ownership
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this property' });
    }

    // Delete images from cloudinary
    if (property.images && property.images.length > 0) {
      await Promise.all(
        property.images.map(img => deleteFromCloudinary(img.publicId))
      );
    }

    await property.deleteOne();

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get my properties
// @route   GET /api/properties/my/properties
// @access  Private
export const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      properties,
      total: properties.length
    });
  } catch (error) {
    console.error('Get my properties error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add review to property
// @route   POST /api/properties/:id/reviews
// @access  Private
export const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Check if already reviewed
    const alreadyReviewed = property.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (alreadyReviewed) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reviewed this property' 
      });
    }

    const review = {
      user: req.user.id,
      rating: Number(rating),
      comment
    };

    property.reviews.push(review);

    // Update average rating
    property.rating = property.reviews.reduce((acc, item) => item.rating + acc, 0) / property.reviews.length;

    await property.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully'
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Save/Unsave property
// @route   POST /api/properties/:id/save
// @access  Private
export const saveProperty = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const propertyId = req.params.id;

    const isSaved = user.savedProperties.includes(propertyId);

    if (isSaved) {
      user.savedProperties = user.savedProperties.filter(
        id => id.toString() !== propertyId
      );
    } else {
      user.savedProperties.push(propertyId);
    }

    await user.save();

    res.json({
      success: true,
      message: isSaved ? 'Property removed from saved' : 'Property saved successfully',
      saved: !isSaved
    });
  } catch (error) {
    console.error('Save property error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get saved properties
// @route   GET /api/properties/saved/list
// @access  Private
export const getSavedProperties = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'savedProperties',
      populate: { path: 'owner', select: 'name email phone role' }
    });

    res.json({
      success: true,
      properties: user.savedProperties
    });
  } catch (error) {
    console.error('Get saved properties error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};