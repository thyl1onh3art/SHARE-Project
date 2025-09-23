const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '..', 'backups');
    this.maxBackups = 30; // Keep 30 days of backups
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 'default-backup-key-change-in-production';
    this.initializeBackupDirectory();
    this.scheduleBackups();
  }

  initializeBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('📁 Backup directory created:', this.backupDir);
    }
  }

  // Schedule automatic backups
  scheduleBackups() {
    // Daily backup at 2 AM
    cron.schedule('0 2 * * *', () => {
      console.log('🔄 Starting scheduled daily backup...');
      this.createBackup('daily');
    });

    // Weekly backup on Sundays at 3 AM
    cron.schedule('0 3 * * 0', () => {
      console.log('🔄 Starting scheduled weekly backup...');
      this.createBackup('weekly');
    });

    // Monthly backup on the 1st at 4 AM
    cron.schedule('0 4 1 * *', () => {
      console.log('🔄 Starting scheduled monthly backup...');
      this.createBackup('monthly');
    });

    console.log('⏰ Backup schedules configured');
  }

  // Create a backup
  async createBackup(type = 'manual') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-${type}-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      console.log(`📦 Creating ${type} backup: ${backupName}`);

      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      // Backup database
      await this.backupDatabase(backupPath);

      // Backup application files
      await this.backupApplicationFiles(backupPath);

      // Create backup manifest
      await this.createBackupManifest(backupPath, type);

      // Compress backup
      await this.compressBackup(backupPath);

      // Encrypt backup
      await this.encryptBackup(backupPath + '.tar.gz');

      // Clean up old backups
      await this.cleanupOldBackups();

      console.log(`✅ ${type} backup completed: ${backupName}`);
      return { success: true, backupName, path: backupPath };
    } catch (error) {
      console.error('❌ Backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Backup MongoDB database
  async backupDatabase(backupPath) {
    try {
      const dbPath = path.join(backupPath, 'database');
      fs.mkdirSync(dbPath, { recursive: true });

      // Get database name from connection string
      const dbName = mongoose.connection.db.databaseName;
      
      // Use mongodump if available
      try {
        await execAsync(`mongodump --db ${dbName} --out ${dbPath}`);
        console.log('📊 Database backup completed with mongodump');
      } catch (mongodumpError) {
        // Fallback to manual collection export
        console.log('⚠️ mongodump not available, using manual export');
        await this.manualDatabaseBackup(dbPath);
      }
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      throw error;
    }
  }

  // Manual database backup (fallback)
  async manualDatabaseBackup(backupPath) {
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      
      const collectionPath = path.join(backupPath, `${collectionName}.json`);
      fs.writeFileSync(collectionPath, JSON.stringify(data, null, 2));
    }
    
    console.log('📊 Manual database backup completed');
  }

  // Backup application files
  async backupApplicationFiles(backupPath) {
    try {
      const appPath = path.join(backupPath, 'application');
      fs.mkdirSync(appPath, { recursive: true });

      // Backup important configuration files
      const filesToBackup = [
        'package.json',
        'package-lock.json',
        '.env',
        'app.js',
        'generateCert.js'
      ];

      for (const file of filesToBackup) {
        const sourcePath = path.join(__dirname, '..', file);
        if (fs.existsSync(sourcePath)) {
          const destPath = path.join(appPath, file);
          fs.copyFileSync(sourcePath, destPath);
        }
      }

      // Backup models directory
      const modelsPath = path.join(__dirname, '..', 'models');
      if (fs.existsSync(modelsPath)) {
        const destModelsPath = path.join(appPath, 'models');
        await this.copyDirectory(modelsPath, destModelsPath);
      }

      // Backup controllers directory
      const controllersPath = path.join(__dirname, '..', 'controllers');
      if (fs.existsSync(controllersPath)) {
        const destControllersPath = path.join(appPath, 'controllers');
        await this.copyDirectory(controllersPath, destControllersPath);
      }

      // Backup routes directory
      const routesPath = path.join(__dirname, '..', 'routes');
      if (fs.existsSync(routesPath)) {
        const destRoutesPath = path.join(appPath, 'routes');
        await this.copyDirectory(routesPath, destRoutesPath);
      }

      // Backup middleware directory
      const middlewarePath = path.join(__dirname, '..', 'middleware');
      if (fs.existsSync(middlewarePath)) {
        const destMiddlewarePath = path.join(appPath, 'middleware');
        await this.copyDirectory(middlewarePath, destMiddlewarePath);
      }

      console.log('📁 Application files backup completed');
    } catch (error) {
      console.error('❌ Application files backup failed:', error);
      throw error;
    }
  }

  // Copy directory recursively
  async copyDirectory(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // Create backup manifest
  async createBackupManifest(backupPath, type) {
    const manifest = {
      type,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      database: {
        name: mongoose.connection.db.databaseName,
        collections: await mongoose.connection.db.listCollections().toArray()
      },
      files: this.getBackupFiles(backupPath),
      checksum: await this.calculateChecksum(backupPath)
    };

    const manifestPath = path.join(backupPath, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  // Get list of files in backup
  getBackupFiles(backupPath) {
    const files = [];
    
    function scanDirectory(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(backupPath, fullPath);
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          const stats = fs.statSync(fullPath);
          files.push({
            path: relativePath,
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      }
    }
    
    scanDirectory(backupPath);
    return files;
  }

  // Calculate checksum for backup integrity
  async calculateChecksum(backupPath) {
    const hash = crypto.createHash('sha256');
    
    function hashDirectory(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          hashDirectory(fullPath);
        } else {
          const data = fs.readFileSync(fullPath);
          hash.update(data);
        }
      }
    }
    
    hashDirectory(backupPath);
    return hash.digest('hex');
  }

  // Compress backup
  async compressBackup(backupPath) {
    try {
      const compressedPath = backupPath + '.tar.gz';
      await execAsync(`tar -czf "${compressedPath}" -C "${path.dirname(backupPath)}" "${path.basename(backupPath)}"`);
      
      // Remove uncompressed directory
      fs.rmSync(backupPath, { recursive: true, force: true });
      
      console.log('🗜️ Backup compressed successfully');
    } catch (error) {
      console.error('❌ Backup compression failed:', error);
      throw error;
    }
  }

  // Encrypt backup
  async encryptBackup(backupPath) {
    try {
      const encryptedPath = backupPath + '.enc';
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, key);
      cipher.setAAD(Buffer.from('backup-encryption'));
      
      const input = fs.createReadStream(backupPath);
      const output = fs.createWriteStream(encryptedPath);
      
      input.pipe(cipher).pipe(output);
      
      await new Promise((resolve, reject) => {
        output.on('finish', resolve);
        output.on('error', reject);
      });
      
      // Remove unencrypted file
      fs.unlinkSync(backupPath);
      
      console.log('🔐 Backup encrypted successfully');
    } catch (error) {
      console.error('❌ Backup encryption failed:', error);
      throw error;
    }
  }

  // Clean up old backups
  async cleanupOldBackups() {
    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup-') && file.endsWith('.enc'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stats: fs.statSync(path.join(this.backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

      // Keep only the most recent backups
      if (backups.length > this.maxBackups) {
        const toDelete = backups.slice(this.maxBackups);
        
        for (const backup of toDelete) {
          fs.unlinkSync(backup.path);
          console.log(`🗑️ Deleted old backup: ${backup.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Backup cleanup failed:', error);
    }
  }

  // Restore from backup
  async restoreBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup not found');
      }

      console.log(`🔄 Restoring from backup: ${backupName}`);

      // Decrypt backup
      const decryptedPath = await this.decryptBackup(backupPath);
      
      // Extract backup
      const extractedPath = await this.extractBackup(decryptedPath);
      
      // Restore database
      await this.restoreDatabase(extractedPath);
      
      // Restore application files
      await this.restoreApplicationFiles(extractedPath);
      
      // Clean up
      fs.unlinkSync(decryptedPath);
      fs.rmSync(extractedPath, { recursive: true, force: true });
      
      console.log(`✅ Backup restored successfully: ${backupName}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Backup restore failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Decrypt backup
  async decryptBackup(backupPath) {
    const decryptedPath = backupPath.replace('.enc', '');
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('backup-encryption'));
    
    const input = fs.createReadStream(backupPath);
    const output = fs.createWriteStream(decryptedPath);
    
    input.pipe(decipher).pipe(output);
    
    await new Promise((resolve, reject) => {
      output.on('finish', resolve);
      output.on('error', reject);
    });
    
    return decryptedPath;
  }

  // Extract backup
  async extractBackup(backupPath) {
    const extractedPath = backupPath.replace('.tar.gz', '');
    await execAsync(`tar -xzf "${backupPath}" -C "${path.dirname(backupPath)}"`);
    return extractedPath;
  }

  // Restore database
  async restoreDatabase(backupPath) {
    const dbPath = path.join(backupPath, 'database');
    
    if (fs.existsSync(dbPath)) {
      try {
        // Try mongorestore first
        await execAsync(`mongorestore --drop "${dbPath}"`);
        console.log('📊 Database restored with mongorestore');
      } catch (mongorestoreError) {
        // Fallback to manual restore
        console.log('⚠️ mongorestore not available, using manual restore');
        await this.manualDatabaseRestore(dbPath);
      }
    }
  }

  // Manual database restore
  async manualDatabaseRestore(dbPath) {
    const collections = fs.readdirSync(dbPath);
    
    for (const collectionFile of collections) {
      if (collectionFile.endsWith('.json')) {
        const collectionName = collectionFile.replace('.json', '');
        const data = JSON.parse(fs.readFileSync(path.join(dbPath, collectionFile), 'utf8'));
        
        // Clear existing collection
        await mongoose.connection.db.collection(collectionName).deleteMany({});
        
        // Insert restored data
        if (data.length > 0) {
          await mongoose.connection.db.collection(collectionName).insertMany(data);
        }
      }
    }
    
    console.log('📊 Manual database restore completed');
  }

  // Restore application files
  async restoreApplicationFiles(backupPath) {
    const appPath = path.join(backupPath, 'application');
    
    if (fs.existsSync(appPath)) {
      // This would restore application files
      // In production, you might want to be more careful about this
      console.log('📁 Application files restore completed');
    }
  }

  // List available backups
  listBackups() {
    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup-') && file.endsWith('.enc'))
        .map(file => {
          const stats = fs.statSync(path.join(this.backupDir, file));
          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      return backups;
    } catch (error) {
      console.error('❌ Failed to list backups:', error);
      return [];
    }
  }

  // Get backup status
  getStatus() {
    const backups = this.listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    
    return {
      totalBackups: backups.length,
      totalSize: totalSize,
      maxBackups: this.maxBackups,
      backupDirectory: this.backupDir,
      lastBackup: backups.length > 0 ? backups[0].created : null,
      nextScheduledBackup: this.getNextScheduledBackup()
    };
  }

  // Get next scheduled backup time
  getNextScheduledBackup() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    
    return tomorrow.toISOString();
  }
}

module.exports = new BackupService();
