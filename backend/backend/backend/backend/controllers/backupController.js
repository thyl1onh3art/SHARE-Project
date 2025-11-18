const backupService = require('../services/backupService');
const auth = require('../middleware/auth');

// Create a manual backup
exports.createBackup = async (req, res) => {
  try {
    const { type = 'manual' } = req.body;
    
    if (!['manual', 'daily', 'weekly', 'monthly'].includes(type)) {
      return res.status(400).json({ 
        message: 'Invalid backup type. Use "manual", "daily", "weekly", or "monthly"' 
      });
    }

    const result = await backupService.createBackup(type);
    
    if (result.success) {
      res.status(201).json({
        message: `${type} backup created successfully`,
        backupName: result.backupName,
        path: result.path
      });
    } else {
      res.status(500).json({
        message: 'Backup creation failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Create backup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// List available backups
exports.listBackups = async (req, res) => {
  try {
    const backups = backupService.listBackups();
    
    res.json({
      message: 'Backups retrieved successfully',
      backups: backups,
      count: backups.length
    });
  } catch (error) {
    console.error('❌ List backups error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get backup status
exports.getBackupStatus = async (req, res) => {
  try {
    const status = backupService.getStatus();
    
    res.json({
      message: 'Backup status retrieved successfully',
      status: status
    });
  } catch (error) {
    console.error('❌ Get backup status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Restore from backup
exports.restoreBackup = async (req, res) => {
  try {
    const { backupName } = req.params;
    
    if (!backupName) {
      return res.status(400).json({ message: 'Backup name is required' });
    }

    const result = await backupService.restoreBackup(backupName);
    
    if (result.success) {
      res.json({
        message: 'Backup restored successfully',
        backupName: backupName
      });
    } else {
      res.status(500).json({
        message: 'Backup restore failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Restore backup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Download backup (admin only)
exports.downloadBackup = async (req, res) => {
  try {
    const { backupName } = req.params;
    
    if (!backupName) {
      return res.status(400).json({ message: 'Backup name is required' });
    }

    const backupPath = require('path').join(backupService.backupDir, backupName);
    
    if (!require('fs').existsSync(backupPath)) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    res.download(backupPath, backupName, (err) => {
      if (err) {
        console.error('❌ Download backup error:', err);
        res.status(500).json({ message: 'Download failed', error: err.message });
      }
    });
  } catch (error) {
    console.error('❌ Download backup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete backup (admin only)
exports.deleteBackup = async (req, res) => {
  try {
    const { backupName } = req.params;
    
    if (!backupName) {
      return res.status(400).json({ message: 'Backup name is required' });
    }

    const backupPath = require('path').join(backupService.backupDir, backupName);
    
    if (!require('fs').existsSync(backupPath)) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    require('fs').unlinkSync(backupPath);
    
    res.json({
      message: 'Backup deleted successfully',
      backupName: backupName
    });
  } catch (error) {
    console.error('❌ Delete backup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
