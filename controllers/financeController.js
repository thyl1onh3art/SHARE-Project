const FinanceRecord = require('../models/FinanceRecord');
const SharedAccount = require('../models/SharedAccount');

// Create a finance record
exports.createRecord = async (req, res) => {
  try {
    const { type, amount, date, description, sharedAccount } = req.body;
    console.log('FinanceController: Creating record', { type, amount, description, sharedAccount, userId: req.user.userId });
    
    const record = new FinanceRecord({
      user: req.user.userId,
      type,
      amount,
      date,
      description,
      sharedAccount: sharedAccount || undefined,
    });
    await record.save();
    console.log('FinanceController: Record saved with ID:', record._id);
    
    // If this record is associated with a shared account, add it to the shared account's financeRecords array
    if (sharedAccount) {
      console.log('FinanceController: Linking record to shared account:', sharedAccount);
      const account = await SharedAccount.findById(sharedAccount);
      if (account) {
        console.log('FinanceController: Found shared account:', account.name);
        // Check if user is owner or member
        const isOwner = account.owner.toString() === req.user.userId;
        const isMember = account.members.some(m => m.toString() === req.user.userId);
        console.log('FinanceController: User authorization - isOwner:', isOwner, 'isMember:', isMember);
        
        if (isOwner || isMember) {
          // Add the record to the shared account's financeRecords array if not already present
          // Convert to strings for comparison since ObjectIds need to be compared as strings
          const recordIdString = record._id.toString();
          const existingIds = account.financeRecords.map((id) => id.toString());
          
          console.log('FinanceController: Checking if record already exists in account');
          console.log('FinanceController: Record ID to add:', recordIdString);
          console.log('FinanceController: Existing record IDs:', existingIds);
          
          if (!existingIds.includes(recordIdString)) {
            console.log('FinanceController: Record not found in account, adding it...');
            account.financeRecords.push(record._id);
            const savedAccount = await account.save();
            console.log('FinanceController: Account saved successfully');
            
            // Verify the record was actually added by re-fetching the account
            const verifiedAccount = await SharedAccount.findById(sharedAccount);
            const verifiedIds = verifiedAccount.financeRecords.map((id) => id.toString());
            console.log('FinanceController: Verified account after save - Total records:', verifiedAccount.financeRecords.length);
            console.log('FinanceController: Verified record IDs:', verifiedIds);
            
            if (verifiedIds.includes(recordIdString)) {
              console.log('FinanceController: SUCCESS - Record confirmed in account financeRecords');
            } else {
              console.error('FinanceController: ERROR - Record was NOT found in account after save!');
            }
            
            console.log('FinanceController: Record added to shared account financeRecords. Total records:', savedAccount.financeRecords.length);
            console.log('FinanceController: Record ID added:', recordIdString);
            console.log('FinanceController: All record IDs in account:', savedAccount.financeRecords.map((id) => id.toString()));
          } else {
            console.log('FinanceController: Record already in shared account financeRecords');
          }
        } else {
          // User is not authorized - delete the record we just created and return error
          console.log('FinanceController: User not authorized, deleting record');
          await FinanceRecord.findByIdAndDelete(record._id);
          return res.status(403).json({ message: 'You are not authorized to add records to this shared account' });
        }
      } else {
        console.log('FinanceController: Shared account not found:', sharedAccount);
      }
    } else {
      console.log('FinanceController: Personal account record (no sharedAccount)');
    }
    
    res.status(201).json(record);
  } catch (err) {
    console.error('FinanceController: Error creating record:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all finance records for the logged-in user
exports.getUserRecords = async (req, res) => {
  try {
    const records = await FinanceRecord.find({ user: req.user.userId });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update a finance record
exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await FinanceRecord.findOneAndUpdate(
      { _id: id, user: req.user.userId },
      req.body,
      { new: true }
    );
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a finance record
exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await FinanceRecord.findOneAndDelete({ _id: id, user: req.user.userId });
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
