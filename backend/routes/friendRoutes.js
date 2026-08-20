const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const auth = require('../middleware/auth');
const { validateAddFriend } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', auth, asyncHandler(friendController.listFriends));
router.post('/', auth, validateAddFriend, asyncHandler(friendController.addFriend));
router.delete('/:friendId', auth, asyncHandler(friendController.removeFriend));

module.exports = router;
