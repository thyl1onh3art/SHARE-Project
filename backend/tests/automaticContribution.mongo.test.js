const mongoose = require('mongoose');
const FinanceRecord = require('../models/FinanceRecord');

/**
 * Optional isolated-Mongo check for processorKey uniqueness.
 * Skips cleanly when localhost Mongo is not running. Never uses production URI.
 */
describe('automatic contribution Mongo uniqueness (optional)', () => {
  const uri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/share_project_test';

  it('enforces a unique processorKey when isolated Mongo is available', async () => {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    } catch (err) {
      console.warn(`Mongo integration unavailable (${uri}): ${err.message}`);
      return;
    }

    try {
      await FinanceRecord.deleteMany({ processorKey: /^task15-test:/ });
      const user = new mongoose.Types.ObjectId();
      await FinanceRecord.create({
        user,
        type: 'input',
        amount: 12.5,
        source: 'automatic',
        scheduledFor: '2026-08-30',
        processorKey: 'task15-test:user:2026-08-30'
      });
      let duplicateError = null;
      try {
        await FinanceRecord.create({
          user,
          type: 'input',
          amount: 12.5,
          source: 'automatic',
          scheduledFor: '2026-08-30',
          processorKey: 'task15-test:user:2026-08-30'
        });
      } catch (err) {
        duplicateError = err;
      }
      expect(duplicateError && duplicateError.code).toBe(11000);
    } finally {
      await FinanceRecord.deleteMany({ processorKey: /^task15-test:/ }).catch(() => {});
      await mongoose.connection.close();
    }
  });
});
