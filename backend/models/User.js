const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  age: { type: Number, required: true },
  interests: [{ type: String }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  calendarSettings: {
    privacy: { type: String, enum: ['private', 'shared'], default: 'private' },
    sharedWith: [{ type: String }] // Array of email addresses
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
