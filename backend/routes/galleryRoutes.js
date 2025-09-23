const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Upload a new image
router.post('/upload', auth, galleryController.uploadMiddleware, asyncHandler(galleryController.uploadImage));

// Get all images for the user
router.get('/images', auth, asyncHandler(galleryController.getUserImages));

// Get a specific image
router.get('/images/:id', auth, asyncHandler(galleryController.getImage));

// Serve image file
router.get('/images/:id/view', auth, asyncHandler(galleryController.serveImage));

// Update image
router.put('/images/:id', auth, asyncHandler(galleryController.updateImage));

// Delete image
router.delete('/images/:id', auth, asyncHandler(galleryController.deleteImage));

// Share image with specific users
router.post('/images/:id/share', auth, asyncHandler(galleryController.shareImage));

module.exports = router;
