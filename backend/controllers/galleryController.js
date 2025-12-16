const GalleryImage = require('../models/GalleryImage');
const Event = require('../models/Event');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/gallery');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload middleware
exports.uploadMiddleware = upload.single('image');

// Upload a new image
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const { caption, tags, eventId, sharedAccountId, isPublic } = req.body;
    
    // Get event title if eventId is provided
    let eventTitle = null;
    if (eventId) {
      const event = await Event.findOne({ _id: eventId, user: req.user.userId });
      if (event) {
        eventTitle = event.title;
      }
    }

    // Get shared account name if sharedAccountId is provided
    let sharedAccountName = null;
    if (sharedAccountId) {
      const SharedAccount = require('../models/SharedAccount');
      const sharedAccount = await SharedAccount.findById(sharedAccountId);
      if (sharedAccount) {
        // Check if user is a member or owner
        const ownerId = typeof sharedAccount.owner === 'object' 
          ? sharedAccount.owner._id.toString() 
          : sharedAccount.owner.toString();
        const isOwner = ownerId === req.user.userId;
        const isMember = sharedAccount.members.some((m) => {
          const memberId = typeof m === 'object' ? m._id.toString() : m.toString();
          return memberId === req.user.userId;
        });
        
        if (!isOwner && !isMember) {
          return res.status(403).json({ message: 'Access denied. You must be a member of this shared account.' });
        }
        
        sharedAccountName = sharedAccount.name;
      }
    }

    const galleryImage = new GalleryImage({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.userId,
      eventId: eventId || null,
      eventTitle: eventTitle,
      sharedAccountId: sharedAccountId || null,
      sharedAccountName: sharedAccountName,
      caption: caption || '',
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      isPublic: isPublic === 'true',
      filePath: req.file.path
    });

    await galleryImage.save();
    res.status(201).json(galleryImage);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all images for the user
exports.getUserImages = async (req, res) => {
  try {
    const { sharedAccountId } = req.query;
    
    // Get all shared accounts where user is a member
    const SharedAccount = require('../models/SharedAccount');
    const userAccounts = await SharedAccount.find({
      $or: [
        { owner: req.user.userId },
        { members: req.user.userId }
      ]
    }).select('_id');
    
    const accountIds = userAccounts.map(acc => acc._id);
    
    let query = {
      $or: [
        { uploadedBy: req.user.userId },
        { isPublic: true },
        { sharedWith: req.user.userId },
        { sharedAccountId: { $in: accountIds } } // Images from shared accounts user is part of
      ]
    };
    
    // Filter by shared account if provided
    if (sharedAccountId) {
      query.sharedAccountId = sharedAccountId;
    }
    
    const images = await GalleryImage.find(query).sort({ createdAt: -1 });
    
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get a specific image
exports.getImage = async (req, res) => {
  try {
    const image = await GalleryImage.findOne({
      _id: req.params.id,
      $or: [
        { uploadedBy: req.user.userId },
        { isPublic: true },
        { sharedWith: req.user.userId }
      ]
    });
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    res.json(image);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Serve image file
exports.serveImage = async (req, res) => {
  try {
    const image = await GalleryImage.findOne({
      _id: req.params.id,
      $or: [
        { uploadedBy: req.user.userId },
        { isPublic: true },
        { sharedWith: req.user.userId }
      ]
    });
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    const filePath = path.join(__dirname, '../uploads/gallery', image.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Image file not found' });
    }
    
    res.setHeader('Content-Type', image.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${image.originalName}"`);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update image
exports.updateImage = async (req, res) => {
  try {
    const { caption, tags, isPublic } = req.body;
    
    const image = await GalleryImage.findOneAndUpdate(
      { _id: req.params.id, uploadedBy: req.user.userId },
      {
        caption: caption || '',
        tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        isPublic: isPublic === 'true'
      },
      { new: true, runValidators: true }
    );
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    res.json(image);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete image
exports.deleteImage = async (req, res) => {
  try {
    const image = await GalleryImage.findOneAndDelete({
      _id: req.params.id,
      uploadedBy: req.user.userId
    });
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Delete the file from filesystem
    const filePath = path.join(__dirname, '../uploads/gallery', image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Share image with specific users
exports.shareImage = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    const image = await GalleryImage.findOneAndUpdate(
      { _id: req.params.id, uploadedBy: req.user.userId },
      { $addToSet: { sharedWith: { $each: userIds } } },
      { new: true }
    );
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    res.json(image);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
