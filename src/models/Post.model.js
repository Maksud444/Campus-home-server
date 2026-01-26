import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userImage: String,
  userRole: {
    type: String,
    default: 'student'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['property', 'roommate', 'room'],
    required: true
  },
  price: Number,
  location: String,
  city: String,
  selectedArea: String,
  addressDetails: String,
  whatsappNumber: String,
  bedrooms: Number,
  bathrooms: Number,
  area: Number,
  propertyType: String,
  furnished: {
    type: Boolean,
    default: false
  },
  amenities: [String],
  images: [String],
  videos: [String],
  preferences: String,
  targetAudience: {
    type: String,
    enum: ['students', 'family'],
    default: 'students'
  },
  likes: [{
    userId: String,
    userName: String,
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true
});

export default mongoose.models.Post || mongoose.model('Post', postSchema);