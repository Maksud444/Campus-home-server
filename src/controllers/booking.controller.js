import Booking from '../models/Booking.model.js';
import Property from '../models/Property.model.js';
import Service from '../models/Service.model.js';

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res) => {
  try {
    const { type, property, service, startDate, endDate, price, notes, contactInfo } = req.body;

    // Validate booking type
    if (type === 'property' && !property) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }
    if (type === 'service' && !service) {
      return res.status(400).json({ success: false, message: 'Service ID is required' });
    }

    // Check if property/service exists
    if (type === 'property') {
      const propertyExists = await Property.findById(property);
      if (!propertyExists) {
        return res.status(404).json({ success: false, message: 'Property not found' });
      }
      if (propertyExists.availability !== 'available') {
        return res.status(400).json({ success: false, message: 'Property is not available' });
      }
    }

    if (type === 'service') {
      const serviceExists = await Service.findById(service);
      if (!serviceExists) {
        return res.status(404).json({ success: false, message: 'Service not found' });
      }
    }

    const booking = await Booking.create({
      type,
      property,
      service,
      user: req.user.id,
      startDate,
      endDate,
      price,
      notes,
      contactInfo
    });

    await booking.populate([
      { path: 'property', populate: { path: 'owner', select: 'name email phone' } },
      { path: 'service', populate: { path: 'provider', select: 'name email phone' } },
      { path: 'user', select: 'name email phone' }
    ]);

    res.status(201).json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user's bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    const { type, status } = req.query;

    const query = { user: req.user.id };
    if (type) query.type = type;
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('property', 'title location price images')
      .populate('service', 'name category priceRange')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('property', 'title location price images owner')
      .populate('service', 'name category priceRange images provider')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private
export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only owner or admin can update
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    booking.status = status;
    await booking.save();

    // Update property availability if confirmed
    if (status === 'confirmed' && booking.type === 'property') {
      await Property.findByIdAndUpdate(booking.property, {
        availability: 'rented'
      });
    }

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only owner can cancel
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking already cancelled' });
    }

    booking.status = 'cancelled';
    await booking.save();

    // Update property availability if it was confirmed
    if (booking.type === 'property' && booking.status === 'confirmed') {
      await Property.findByIdAndUpdate(booking.property, {
        availability: 'available'
      });
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};