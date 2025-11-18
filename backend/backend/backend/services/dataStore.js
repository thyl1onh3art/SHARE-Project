const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DataStore {
  constructor() {
    this.data = {
      users: new Map(),
      events: new Map(),
      financeRecords: new Map(),
      sharedAccounts: new Map(),
      invites: new Map(),
      galleryImages: new Map(),
      twoFactorAuth: new Map(),
      twoFactorCodes: new Map(),
      emailVerifications: new Map()
    };
    
    this.dataDir = path.join(__dirname, 'data');
    this.ensureDataDirectory();
    this.loadFromFiles();
    
    // Auto-save every 30 seconds
    setInterval(() => {
      this.saveToFiles();
    }, 30000);
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  loadFromFiles() {
    try {
      Object.keys(this.data).forEach(collection => {
        const filePath = path.join(this.dataDir, `${collection}.json`);
        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath, 'utf8');
          const jsonData = JSON.parse(fileData);
          
          // Convert array back to Map
          this.data[collection] = new Map(jsonData);
          console.log(`✅ Loaded ${this.data[collection].size} ${collection} from file`);
        }
      });
    } catch (error) {
      console.error('❌ Error loading data from files:', error.message);
    }
  }

  saveToFiles() {
    try {
      Object.keys(this.data).forEach(collection => {
        const filePath = path.join(this.dataDir, `${collection}.json`);
        const mapData = Array.from(this.data[collection].entries());
        fs.writeFileSync(filePath, JSON.stringify(mapData, null, 2));
      });
    } catch (error) {
      console.error('❌ Error saving data to files:', error.message);
    }
  }

  // Generic CRUD operations
  create(collection, data) {
    const id = uuidv4();
    const item = {
      _id: id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.data[collection].set(id, item);
    return item;
  }

  findById(collection, id) {
    return this.data[collection].get(id) || null;
  }

  findOne(collection, query) {
    for (const [id, item] of this.data[collection]) {
      let match = true;
      for (const [key, value] of Object.entries(query)) {
        if (item[key] !== value) {
          match = false;
          break;
        }
      }
      if (match) return item;
    }
    return null;
  }

  find(collection, query = {}) {
    const results = [];
    for (const [id, item] of this.data[collection]) {
      let match = true;
      for (const [key, value] of Object.entries(query)) {
        if (item[key] !== value) {
          match = false;
          break;
        }
      }
      if (match) results.push(item);
    }
    return results;
  }

  update(collection, id, updateData) {
    const existing = this.data[collection].get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    this.data[collection].set(id, updated);
    return updated;
  }

  delete(collection, id) {
    return this.data[collection].delete(id);
  }

  count(collection, query = {}) {
    if (Object.keys(query).length === 0) {
      return this.data[collection].size;
    }
    return this.find(collection, query).length;
  }

  // Collection-specific methods
  findByEmail(email) {
    return this.findOne('users', { email });
  }

  findByUsername(username) {
    return this.findOne('users', { username });
  }

  findEventsByUserId(userId) {
    return this.find('events', { userId });
  }

  findFinanceRecordsByUserId(userId) {
    return this.find('financeRecords', { userId });
  }

  findSharedAccountsByUserId(userId) {
    return this.find('sharedAccounts', { userId });
  }

  findInvitesByEmail(email) {
    return this.find('invites', { email });
  }

  findGalleryImagesByUserId(userId) {
    return this.find('galleryImages', { userId });
  }

  // Statistics
  getStats() {
    return {
      users: this.data.users.size,
      events: this.data.events.size,
      financeRecords: this.data.financeRecords.size,
      sharedAccounts: this.data.sharedAccounts.size,
      invites: this.data.invites.size,
      galleryImages: this.data.galleryImages.size,
      twoFactorAuth: this.data.twoFactorAuth.size,
      twoFactorCodes: this.data.twoFactorCodes.size,
      emailVerifications: this.data.emailVerifications.size
    };
  }

  // Cleanup expired data
  cleanupExpiredData() {
    const now = new Date();
    
    // Clean expired 2FA codes (older than 10 minutes)
    for (const [id, code] of this.data.twoFactorCodes) {
      const createdAt = new Date(code.createdAt);
      if (now - createdAt > 10 * 60 * 1000) { // 10 minutes
        this.data.twoFactorCodes.delete(id);
      }
    }

    // Clean expired email verifications (older than 24 hours)
    for (const [id, verification] of this.data.emailVerifications) {
      const createdAt = new Date(verification.createdAt);
      if (now - createdAt > 24 * 60 * 60 * 1000) { // 24 hours
        this.data.emailVerifications.delete(id);
      }
    }
  }
}

// Create singleton instance
const dataStore = new DataStore();

// Cleanup expired data every hour
setInterval(() => {
  dataStore.cleanupExpiredData();
}, 60 * 60 * 1000);

module.exports = dataStore;
