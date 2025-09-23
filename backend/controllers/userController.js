const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const FinanceRecord = require('../models/FinanceRecord');
const SharedAccount = require('../models/SharedAccount');
const Invite = require('../models/Invite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, age, interests, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if email is verified (temporarily disabled for testing)
    // const emailVerification = await EmailVerification.findOne({ 
    //   email, 
    //   verified: true,
    //   expiresAt: { $gt: new Date() }
    // });

    // if (!emailVerification) {
    //   return res.status(400).json({ 
    //     message: 'Email verification required. Please verify your email before registering.' 
    //   });
    // }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      name,
      age,
      interests,
      email,
      password: hashedPassword,
    });
    
    await user.save();
    
    // Clean up the verification record after successful registration (temporarily disabled)
    // await EmailVerification.findByIdAndDelete(emailVerification._id);
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, age, interests } = req.body;
    const userId = req.user.userId;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = age;
    if (interests !== undefined) updateData.interests = interests;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Profile updated successfully', 
      user 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Delete all user-related data
    await Promise.all([
      // Delete user's finance records
      FinanceRecord.deleteMany({ userId }),
      
      // Remove user from shared accounts
      SharedAccount.updateMany(
        { members: userId },
        { $pull: { members: userId } }
      ),
      
      // Delete shared accounts owned by user
      SharedAccount.deleteMany({ owner: userId }),
      
      // Delete invitations sent by user
      Invite.deleteMany({ fromUser: userId }),
      
      // Delete invitations sent to user
      Invite.deleteMany({ toUser: userId }),
      
      // Delete email verification records
      EmailVerification.deleteMany({ email: req.user.email }),
      
      // Finally, delete the user
      User.findByIdAndDelete(userId)
    ]);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
