const User = require('../models/mongoose/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, firstName, lastName, age, interests, email, password, username } = req.body;
    
    // Handle both frontend formats (name or firstName/lastName)
    // If only name is provided, split it or use as firstName
    let userFirstName, userLastName;
    if (firstName && lastName) {
      userFirstName = firstName;
      userLastName = lastName;
    } else if (name) {
      const nameParts = name.trim().split(/\s+/);
      userFirstName = nameParts[0] || '';
      userLastName = nameParts.slice(1).join(' ') || nameParts[0] || ''; // Use first name as last name fallback
    } else {
      userFirstName = '';
      userLastName = '';
    }
    
    // Validate user data
    const validationErrors = await User.validateUserData({
      username: username || email.split('@')[0], // Use email prefix as username if not provided
      firstName: userFirstName,
      lastName: userLastName,
      email,
      password
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }

    // Create user
    const user = await User.create({
      username: username || email.split('@')[0],
      firstName: userFirstName,
      lastName: userLastName,
      age,
      interests,
      email,
      password
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Login successful',
      token, 
      user: user.toPublicJSON() 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, preferences } = req.body;
    const userId = req.user.userId;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (preferences) updateData.preferences = preferences;

    const updatedUser = await User.updateById(userId, updateData);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser.toPublicJSON() 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (!User.validatePassword(newPassword)) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters with uppercase, lowercase, and number' 
      });
    }

    await User.updatePassword(userId, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password confirmation is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Password is incorrect' });
    }

    await User.deleteById(userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    const publicUsers = users.map(user => user.toPublicJSON());
    
    res.json({ 
      users: publicUsers,
      count: users.length 
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to get users', error: error.message });
  }
};

// Get user by ID (admin only)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Failed to get user', error: error.message });
  }
};