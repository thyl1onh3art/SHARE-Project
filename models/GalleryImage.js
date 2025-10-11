const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  eventTitle: { type: String },
  caption: { type: String, default: '' },
  tags: [{ type: String }],
  isPublic: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  filePath: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
