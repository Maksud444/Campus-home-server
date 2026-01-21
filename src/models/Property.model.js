import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  type: {
    type: String,
    enum: ['apartment', 'studio', 'room', 'villa', 'shared'],
    required: [true, 'Property type is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  location: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    area: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  bedrooms: {
    type: Number,
    min: 0,
    default: 1
  },
  bathrooms: {
    type: Number,
    min: 0,
    default: 1
  },
  area: {
    type: Number,
    min: 0
  },
  images: [{
    url: String,
    publicId: String
  }],
  amenities: [{
    type: String
  }],
  nearbyUniversities: [{
    name: String,
    distance: String
  }],
  availability: {
    type: String,
    enum: ['available', 'rented', 'pending'],
    default: 'available'
  },
  furnished: {
    type: Boolean,
    default: false
  },
  // Owner can be student, agent, or owner role
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerType: {
    type: String,
    enum: ['student', 'agent', 'owner'],
    required: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'rejected'],
    default: 'pending'
  },
  // Agent specific fields
  commission: {
    type: Number,
    min: 0
  },
  agentContact: {
    phone: String,
    email: String
  }
}, {
  timestamps: true
});

// Index for search
propertySchema.index({ title: 'text', description: 'text' });
propertySchema.index({ 'location.city': 1, 'location.area': 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ type: 1 });
propertySchema.index({ owner: 1 });
propertySchema.index({ ownerType: 1 });
propertySchema.index({ status: 1 });

const Property = mongoose.model('Property', propertySchema);

export default Property;