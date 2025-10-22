const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  eventDate: { type: String, required: true }, // YYYY-MM-DD format
  eventTime: { type: String, required: true }, // HH:MM format
  location: { type: String },
  category: { 
    type: String, 
    enum: ['social', 'birthday', 'holiday', 'anniversary', 'travel', 'work', 'sports', 'concert', 'other'],
    default: 'social'
  },
  isRecurring: { type: Boolean, default: false },
  recurringType: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: 'yearly'
  },
  // Budget Planning Features
  budget: {
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    savingsGoal: { type: Number, default: 0 },
    savingsFrequency: { 
      type: String, 
      enum: ['weekly', 'biweekly', 'monthly'],
      default: 'monthly'
    },
    amountPerPeriod: { type: Number, default: 0 },
    startDate: { type: String }, // When to start saving
    isActive: { type: Boolean, default: false }
  },
  // Shared Features
  isShared: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Accommodation
  accommodation: {
    name: { type: String },
    type: { 
      type: String, 
      enum: ['hotel', 'airbnb', 'hostel', 'resort', 'other'],
      default: 'hotel'
    },
    price: { type: Number, default: 0 },
    bookingLink: { type: String },
    notes: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
