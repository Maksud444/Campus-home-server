import User from '../models/User.model.js';
import Property from '../models/Property.model.js';
import Service from '../models/Service.model.js';
import Booking from '../models/Booking.model.js';

// @desc    Get student dashboard data
// @route   GET /api/dashboard/student
// @access  Private (Student)
export const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get saved properties
    const savedProperties = await Property.find({
      _id: { $in: req.user.savedProperties }
    }).limit(5);

    // Get bookings
    const bookings = await Booking.find({ user: userId })
      .populate('property', 'title location price images')
      .populate('service', 'name category priceRange')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get statistics
    const stats = {
      totalBookings: await Booking.countDocuments({ user: userId }),
      activeBookings: await Booking.countDocuments({ user: userId, status: 'confirmed' }),
      savedProperties: savedProperties.length,
      pendingBookings: await Booking.countDocuments({ user: userId, status: 'pending' })
    };

    res.json({
      success: true,
      data: {
        stats,
        savedProperties,
        recentBookings: bookings
      }
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get agent dashboard data
// @route   GET /api/dashboard/agent
// @access  Private (Agent)
export const getAgentDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get agent's properties
    const properties = await Property.find({ owner: userId, ownerType: 'agent' })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get statistics
    const stats = {
      totalProperties: await Property.countDocuments({ owner: userId, ownerType: 'agent' }),
      activeProperties: await Property.countDocuments({ owner: userId, ownerType: 'agent', status: 'active' }),
      rentedProperties: await Property.countDocuments({ owner: userId, ownerType: 'agent', availability: 'rented' }),
      pendingProperties: await Property.countDocuments({ owner: userId, ownerType: 'agent', status: 'pending' }),
      totalViews: properties.reduce((sum, prop) => sum + prop.views, 0)
    };

    // Get recent bookings for agent's properties
    const propertyIds = properties.map(p => p._id);
    const recentBookings = await Booking.find({ property: { $in: propertyIds } })
      .populate('user', 'name email phone')
      .populate('property', 'title location price')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats,
        properties,
        recentBookings
      }
    });
  } catch (error) {
    console.error('Agent dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get owner dashboard data
// @route   GET /api/dashboard/owner
// @access  Private (Owner)
export const getOwnerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get owner's properties
    const properties = await Property.find({ owner: userId, ownerType: 'owner' })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get statistics
    const stats = {
      totalProperties: await Property.countDocuments({ owner: userId, ownerType: 'owner' }),
      activeProperties: await Property.countDocuments({ owner: userId, ownerType: 'owner', status: 'active' }),
      rentedProperties: await Property.countDocuments({ owner: userId, ownerType: 'owner', availability: 'rented' }),
      availableProperties: await Property.countDocuments({ owner: userId, ownerType: 'owner', availability: 'available' }),
      totalRevenue: properties.reduce((sum, prop) => {
        return prop.availability === 'rented' ? sum + prop.price : sum;
      }, 0)
    };

    // Get recent bookings
    const propertyIds = properties.map(p => p._id);
    const recentBookings = await Booking.find({ property: { $in: propertyIds } })
      .populate('user', 'name email phone')
      .populate('property', 'title location price')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats,
        properties,
        recentBookings
      }
    });
  } catch (error) {
    console.error('Owner dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get service provider dashboard data
// @route   GET /api/dashboard/service-provider
// @access  Private (Service Provider)
export const getServiceProviderDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get provider's services
    const services = await Service.find({ provider: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get statistics
    const stats = {
      totalServices: await Service.countDocuments({ provider: userId }),
      activeServices: await Service.countDocuments({ provider: userId, status: 'active' }),
      completedJobs: services.reduce((sum, service) => sum + service.completedJobs, 0),
      averageRating: services.reduce((sum, service) => sum + service.rating, 0) / services.length || 0
    };

    // Get recent service bookings
    const serviceIds = services.map(s => s._id);
    const recentBookings = await Booking.find({ service: { $in: serviceIds } })
      .populate('user', 'name email phone')
      .populate('service', 'name category priceRange')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats,
        services,
        recentBookings
      }
    });
  } catch (error) {
    console.error('Service provider dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get admin dashboard data
// @route   GET /api/dashboard/admin
// @access  Private (Admin)
export const getAdminDashboard = async (req, res) => {
  try {
    // Get overall statistics
    const stats = {
      totalUsers: await User.countDocuments(),
      totalStudents: await User.countDocuments({ role: 'student' }),
      totalAgents: await User.countDocuments({ role: 'agent' }),
      totalOwners: await User.countDocuments({ role: 'owner' }),
      totalServiceProviders: await User.countDocuments({ role: 'service-provider' }),
      totalProperties: await Property.countDocuments(),
      activeProperties: await Property.countDocuments({ status: 'active' }),
      pendingProperties: await Property.countDocuments({ status: 'pending' }),
      totalServices: await Service.countDocuments(),
      totalBookings: await Booking.countDocuments(),
      pendingBookings: await Booking.countDocuments({ status: 'pending' })
    };

    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-password');

    // Get recent properties
    const recentProperties = await Property.find()
      .populate('owner', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get recent bookings
    const recentBookings = await Booking.find()
      .populate('user', 'name email')
      .populate('property', 'title location')
      .populate('service', 'name category')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats,
        recentUsers,
        recentProperties,
        recentBookings
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};