const bcrypt = require('bcryptjs');
const dataStore = require('../services/dataStore');

class User {
  constructor(data) {
    this._id = data._id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phone = data.phone;
    this.isEmailVerified = data.isEmailVerified || false;
    this.isTwoFactorEnabled = data.isTwoFactorEnabled || false;
    this.twoFactorSecret = data.twoFactorSecret;
    this.profilePicture = data.profilePicture;
    this.preferences = data.preferences || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Static methods for database operations
  static async create(userData) {
    try {
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      const user = {
        ...userData,
        password: hashedPassword,
        isEmailVerified: false,
        isTwoFactorEnabled: false,
        preferences: {}
      };

      return dataStore.create('users', user);
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  static async findById(id) {
    return dataStore.findById('users', id);
  }

  static async findByEmail(email) {
    return dataStore.findByEmail(email);
  }

  static async findByUsername(username) {
    return dataStore.findByUsername(username);
  }

  static async findOne(query) {
    return dataStore.findOne('users', query);
  }

  static async find(query = {}) {
    return dataStore.find('users', query);
  }

  static async updateById(id, updateData) {
    // Don't allow password updates through this method
    const { password, ...safeUpdateData } = updateData;
    return dataStore.update('users', id, safeUpdateData);
  }

  static async updatePassword(id, newPassword) {
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      return dataStore.update('users', id, { password: hashedPassword });
    } catch (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  static async deleteById(id) {
    return dataStore.delete('users', id);
  }

  static async count(query = {}) {
    return dataStore.count('users', query);
  }

  // Instance methods
  async save() {
    try {
      const updateData = {
        username: this.username,
        email: this.email,
        firstName: this.firstName,
        lastName: this.lastName,
        phone: this.phone,
        isEmailVerified: this.isEmailVerified,
        isTwoFactorEnabled: this.isTwoFactorEnabled,
        twoFactorSecret: this.twoFactorSecret,
        profilePicture: this.profilePicture,
        preferences: this.preferences
      };

      const updated = dataStore.update('users', this._id, updateData);
      if (updated) {
        Object.assign(this, updated);
      }
      return updated;
    } catch (error) {
      throw new Error(`Failed to save user: ${error.message}`);
    }
  }

  async comparePassword(candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      throw new Error(`Password comparison failed: ${error.message}`);
    }
  }

  toJSON() {
    const { password, twoFactorSecret, ...user } = this;
    return user;
  }

  toPublicJSON() {
    const { password, twoFactorSecret, email, phone, ...user } = this;
    return user;
  }

  // Validation methods
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  static validateUsername(username) {
    // 3-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }

  // Static validation method
  static async validateUserData(userData) {
    const errors = [];

    if (!userData.username || !this.validateUsername(userData.username)) {
      errors.push('Username must be 3-20 characters and contain only letters, numbers, and underscores');
    }

    if (!userData.email || !this.validateEmail(userData.email)) {
      errors.push('Please provide a valid email address');
    }

    if (!userData.password || !this.validatePassword(userData.password)) {
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
      const existingEmail = await this.findByEmail(userData.email);
      if (existingEmail) {
        errors.push('Email already exists');
      }
    }

    if (userData.username) {
      const existingUsername = await this.findByUsername(userData.username);
      if (existingUsername) {
        errors.push('Username already exists');
      }
    }

    return errors;
  }
}

module.exports = User;