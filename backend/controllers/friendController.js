const mongoose = require('mongoose');
const User = require('../models/User');
const { rememberFriend } = require('../services/friendService');

const formatFriend = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
  email: user.email
});

exports.listFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('friends', 'firstName lastName email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friends = (user.friends || [])
      .filter(Boolean)
      .map(formatFriend)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(friends);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.addFriend = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const friend = await User.findOne({ email: normalizedEmail });
    if (!friend) {
      // Same customer-facing message as recovered prototype (email existence check).
      // A more generic "could not add" message is deferred to avoid expanding Integration 1 scope/tests.
      return res.status(404).json({ message: 'No SHARE account found with that email' });
    }

    if (friend._id.equals(req.user.userId)) {
      return res.status(400).json({ message: 'You cannot add yourself to your friends list' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const alreadyFriend = (user.friends || []).some((friendId) => friendId.equals(friend._id));
    if (alreadyFriend) {
      return res.status(400).json({ message: 'This person is already in your friends list' });
    }

    await rememberFriend(user._id, friend._id);

    res.status(201).json({
      message: 'Friend added to your list',
      friend: formatFriend(friend)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ message: 'Invalid friend ID' });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const beforeCount = (user.friends || []).length;
    user.friends = (user.friends || []).filter((id) => !id.equals(friendId));

    if (user.friends.length === beforeCount) {
      return res.status(404).json({ message: 'Friend not found in your list' });
    }

    await user.save();
    res.json({ message: 'Friend removed from your list' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
