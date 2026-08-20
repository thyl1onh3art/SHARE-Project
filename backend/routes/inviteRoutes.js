const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/inviteController');
const auth = require('../middleware/auth');
const { validateInvite, validateAcceptInvite, validateRemoveMember } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Send an invite to a user by email/phone
router.post('/send', auth, validateInvite, asyncHandler(inviteController.sendInvite));

// Accept an invite
router.post('/accept', auth, validateAcceptInvite, asyncHandler(inviteController.acceptInvite));

// Remove a member from a shared account
router.post('/remove-member', auth, validateRemoveMember, asyncHandler(inviteController.removeMember));

// Cancel (revoke) an invite
router.post('/cancel', auth, asyncHandler(inviteController.cancelInvite));

// Resend an invite
router.post('/resend', auth, asyncHandler(inviteController.resendInvite));

// List invites for the logged-in user
router.get('/list', auth, asyncHandler(inviteController.listInvites));

// Unread pending invitations for the authenticated recipient
router.get('/unread-count', auth, asyncHandler(inviteController.getUnreadCount));

// Mark recipient's pending unread invitations as read
router.post('/mark-read', auth, asyncHandler(inviteController.markInvitesRead));

// Mark a single invitation as read (recipient only)
router.post('/:inviteId/mark-read', auth, asyncHandler(inviteController.markInviteRead));

module.exports = router;
