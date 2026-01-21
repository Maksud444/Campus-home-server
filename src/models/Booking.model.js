import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['property', 'service'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  price: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank-transfer'],
    default: 'cash'
  },
  notes: {
    type: String
  },
  contactInfo: {
    name: String,
    phone: String,
    email: String
  }
}, {
  timestamps: true
});

// Index for queries
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ property: 1, status: 1 });
bookingSchema.index({ service: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;