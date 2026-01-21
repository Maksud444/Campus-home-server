import Service from '../models/Service.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

// @desc    Get all services
// @route   GET /api/services
// @access  Public
export const getAllServices = async (req, res) => {
  try {
    const { 
      category, 
      city, 
      minPrice, 
      maxPrice, 
      search,
      page = 1,
      limit = 12 
    } = req.query;

    const query = { status: 'active' };

    if (category) query.category = category;
    if (city) query['location.city'] = new RegExp(city, 'i');
    
    if (minPrice || maxPrice) {
      query['priceRange.min'] = {};
      if (minPrice) query['priceRange.min'].$gte = parseFloat(minPrice);
      if (maxPrice) query['priceRange.max'] = { $lte: parseFloat(maxPrice) };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const services = await Service.find(query)
      .populate('provider', 'name email phone avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Service.countDocuments(query);

    res.json({
      success: true,
      services,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Public
export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('provider', 'name email phone avatar')
      .populate('reviews.user', 'name avatar');

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create service
// @route   POST /api/services
// @access  Private (Service Provider)
export const createService = async (req, res) => {
  try {
    const serviceData = req.body;
    serviceData.provider = req.user.id;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageUploads = await Promise.all(
        req.files.map(file => uploadToCloudinary(file.path))
      );
      serviceData.images = imageUploads.map(upload => ({
        url: upload.secure_url,
        publicId: upload.public_id
      }));
    }

    const service = await Service.create(serviceData);

    res.status(201).json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Service Provider - Own service)
export const updateService = async (req, res) => {
  try {
    let service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Check ownership
    if (service.provider.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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
      req.body.images = [...(service.images || []), ...newImages];
    }

    service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private (Service Provider - Own service)
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Check ownership
    if (service.provider.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete images from cloudinary
    if (service.images && service.images.length > 0) {
      await Promise.all(
        service.images.map(img => deleteFromCloudinary(img.publicId))
      );
    }

    await service.deleteOne();

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add review to service
// @route   POST /api/services/:id/reviews
// @access  Private
export const addServiceReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Check if already reviewed
    const alreadyReviewed = service.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (alreadyReviewed) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reviewed this service' 
      });
    }

    const review = {
      user: req.user.id,
      rating: Number(rating),
      comment
    };

    service.reviews.push(review);

    // Update average rating
    service.rating = service.reviews.reduce((acc, item) => item.rating + acc, 0) / service.reviews.length;

    await service.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully'
    });
  } catch (error) {
    console.error('Add service review error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};