const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import Mongoose models
const { User, Event, FinanceRecord, SharedAccount, Invite, GalleryImage, TwoFactorAuth, TwoFactorCode, EmailVerification } = require('./models/mongoose');

// Import MongoDB service
const mongodbService = require('./services/mongodb');

class DataMigration {
  constructor() {
    this.dataDir = path.join(__dirname, 'services', 'data');
    this.migratedCounts = {
      users: 0,
      events: 0,
      financeRecords: 0,
      sharedAccounts: 0,
      invites: 0,
      galleryImages: 0,
      twoFactorAuth: 0,
      twoFactorCodes: 0,
      emailVerifications: 0
    };
  }

  async connect() {
    try {
      await mongodbService.connect();
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      process.exit(1);
    }
  }

  async migrateCollection(collectionName, Model) {
    try {
      const filePath = path.join(this.dataDir, `${collectionName}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ No data file found for ${collectionName}, skipping...`);
        return;
      }

      const fileData = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileData);
      
      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        console.log(`⚠️ No data in ${collectionName} file, skipping...`);
        return;
      }

      console.log(`🔄 Migrating ${jsonData.length} ${collectionName}...`);

      // Clear existing data (optional - remove this line if you want to keep existing data)
      await Model.deleteMany({});

      // Insert data in batches
      const batchSize = 100;
      for (let i = 0; i < jsonData.length; i += batchSize) {
        const batch = jsonData.slice(i, i + batchSize);
        
        // Convert Map entries back to objects
        const documents = batch.map(([id, data]) => ({
          _id: id,
          ...data
        }));

        await Model.insertMany(documents, { ordered: false });
        console.log(`✅ Migrated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jsonData.length / batchSize)}`);
      }

      this.migratedCounts[collectionName] = jsonData.length;
      console.log(`✅ Successfully migrated ${jsonData.length} ${collectionName}`);
    } catch (error) {
      console.error(`❌ Error migrating ${collectionName}:`, error.message);
    }
  }

  async migrateAll() {
    console.log('🚀 Starting data migration from file store to MongoDB...');
    
    await this.connect();

    // Migrate collections
    await this.migrateCollection('users', User);
    await this.migrateCollection('events', Event);
    await this.migrateCollection('financeRecords', FinanceRecord);
    await this.migrateCollection('sharedAccounts', SharedAccount);
    await this.migrateCollection('invites', Invite);
    await this.migrateCollection('galleryImages', GalleryImage);
    await this.migrateCollection('twoFactorAuth', TwoFactorAuth);
    await this.migrateCollection('twoFactorCodes', TwoFactorCode);
    await this.migrateCollection('emailVerifications', EmailVerification);

    console.log('\n📊 Migration Summary:');
    console.log('==================');
    Object.entries(this.migratedCounts).forEach(([collection, count]) => {
      console.log(`${collection}: ${count} documents`);
    });

    const totalMigrated = Object.values(this.migratedCounts).reduce((sum, count) => sum + count, 0);
    console.log(`\n✅ Total documents migrated: ${totalMigrated}`);
    
    await mongodbService.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }

  async verifyMigration() {
    console.log('\n🔍 Verifying migration...');
    
    await this.connect();

    const counts = {
      users: await User.countDocuments(),
      events: await Event.countDocuments(),
      financeRecords: await FinanceRecord.countDocuments(),
      sharedAccounts: await SharedAccount.countDocuments(),
      invites: await Invite.countDocuments(),
      galleryImages: await GalleryImage.countDocuments(),
      twoFactorAuth: await TwoFactorAuth.countDocuments(),
      twoFactorCodes: await TwoFactorCode.countDocuments(),
      emailVerifications: await EmailVerification.countDocuments()
    };

    console.log('📊 Current MongoDB counts:');
    Object.entries(counts).forEach(([collection, count]) => {
      console.log(`${collection}: ${count} documents`);
    });

    await mongodbService.disconnect();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  const migration = new DataMigration();
  
  const command = process.argv[2];
  
  if (command === 'verify') {
    migration.verifyMigration();
  } else {
    migration.migrateAll();
  }
}

module.exports = DataMigration;
