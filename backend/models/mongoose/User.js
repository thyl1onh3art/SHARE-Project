const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-zA-Z0-9_]{3,20}$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  phone: {
    type: String,
    trim: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isTwoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  profilePicture: {
    type: String,
    default: null
  },
  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorSecret;
      return ret;
    }
  }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(`Password comparison failed: ${error.message}`);
  }
};

// Instance method to get public profile
userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.twoFactorSecret;
  delete user.email;
  delete user.phone;
  return user;
};

// Static method to validate user data
userSchema.statics.validateUserData = async function(userData) {
  const errors = [];

  if (!userData.username || !/^[a-zA-Z0-9_]{3,20}$/.test(userData.username)) {
    errors.push('Username must be 3-20 characters and contain only letters, numbers, and underscores');
  }

  if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Please provide a valid email address');
  }

  if (!userData.password || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(userData.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }

  if (!userData.firstName || userData.firstName.trim().length < 2) {
    errors.push('First name must be at least 2 characters');
  }

  if (!userData.lastName || userData.lastName.trim().length < 2) {
    errors.push('Last name must be at least 2 characters');
  }

  // Check for existing users
  if (userData.email) {
    const existingEmail = await this.findOne({ email: userData.email });
    if (existingEmail) {
      errors.push('Email already exists');
    }
  }

  if (userData.username) {
    const existingUsername = await this.findOne({ username: userData.username });
    if (existingUsername) {
      errors.push('Username already exists');
    }
  }

  return errors;
};

// Static method to find user by email
userSchema.statics.findByEmail = async function(email) {
  try {
    return await this.findOne({ email: email.toLowerCase() });
  } catch (error) {
    throw new Error(`Failed to find user by email: ${error.message}`);
  }
};

// Static method to update password
userSchema.statics.updatePassword = async function(userId, newPassword) {
  try {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    return await this.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
  } catch (error) {
    throw new Error(`Failed to update password: ${error.message}`);
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
