# Group Payment Feature - Virtual Account System

> **CURRENT STATUS (marketing-alignment Phase 9, 2026-08-20):**  
> This document describes a **proposed / historical** virtual group-payment and PayPal merchant-payment design.  
> The live application under `backend/` does **not** currently mount `/api/group-payments` routes and does **not** execute PayPal/Stripe settlement for Trip Money.  
> Live Trip Money records contributions and settlement *records* in MongoDB only. Treat this file as design reference, not as evidence of live payment functionality.

## ⚠️ IMPORTANT: Legal Compliance

This implementation uses a **Virtual Account System** that:
- ✅ Tracks commitments (not real money)
- ✅ Shows virtual balances
- ✅ Coordinates single payment
- ✅ **NEVER holds actual money**
- ✅ **Legal without license**

**Money Flow:**
```
Users commit → Virtual tracking → Single PayPal payment → Merchant
(You never touch the money)
```

---

## 🎯 How It Works

### Example: 4 people, £100 event tickets

1. **Owner sets target**: £100
2. **User A commits**: £25 (tracked in database)
3. **User B commits**: £25 (tracked in database)
4. **User C commits**: £25 (tracked in database)
5. **User D commits**: £25 (tracked in database)
6. **System shows**: £100 committed, ready to pay
7. **Owner creates payment**: Single £100 PayPal payment
8. **Owner approves on PayPal**: Payment goes to merchant
9. **Money flow**: Users → PayPal → Merchant (you never hold it)

---

## 📡 API Endpoints

### 1. Set Payment Target (Owner Only)
```http
POST /api/group-payments/set-target
Authorization: Bearer <token>
Content-Type: application/json

{
  "sharedAccountId": "account_id",
  "targetAmount": 100.00,
  "description": "Event tickets"
}
```

### 2. Commit Contribution (Members)
```http
POST /api/group-payments/commit
Authorization: Bearer <token>
Content-Type: application/json

{
  "sharedAccountId": "account_id",
  "amount": 25.00,
  "description": "My share"
}
```

### 3. Get Payment Status
```http
GET /api/group-payments/status/:sharedAccountId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "hasGroupPayment": true,
  "groupPayment": {
    "targetAmount": 100.00,
    "totalCommitted": 100.00,
    "remaining": 0.00,
    "status": "pending",
    "progress": "100.0",
    "contributions": [
      {
        "userId": "user_id",
        "userName": "John",
        "amount": 25.00,
        "status": "committed"
      }
    ]
  }
}
```

### 4. Create PayPal Payment (Owner Only)
```http
POST /api/group-payments/create-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "sharedAccountId": "account_id",
  "merchantEmail": "merchant@example.com",
  "merchantName": "Event Ticket Seller"
}
```

### 5. Cancel Group Payment (Owner Only)
```http
POST /api/group-payments/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "sharedAccountId": "account_id"
}
```

---

## 💡 Frontend Implementation Example

```tsx
// GroupPayment.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const GroupPayment = ({ sharedAccountId }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [amount, setAmount] = useState('');
  const [targetAmount, setTargetAmount] = useState('');

  // Get payment status
  useEffect(() => {
    fetchStatus();
  }, [sharedAccountId]);

  const fetchStatus = async () => {
    const response = await axios.get(`/group-payments/status/${sharedAccountId}`);
    setStatus(response.data.groupPayment);
  };

  // Set target (owner only)
  const handleSetTarget = async () => {
    await axios.post('/group-payments/set-target', {
      sharedAccountId,
      targetAmount: parseFloat(targetAmount),
      description: 'Group payment'
    });
    fetchStatus();
  };

  // Commit contribution
  const handleCommit = async () => {
    await axios.post('/group-payments/commit', {
      sharedAccountId,
      amount: parseFloat(amount),
      description: 'My contribution'
    });
    fetchStatus();
  };

  // Create payment (owner only)
  const handleCreatePayment = async () => {
    const response = await axios.post('/group-payments/create-payment', {
      sharedAccountId,
      merchantEmail: 'merchant@example.com'
    });
    
    // Redirect to PayPal
    window.location.href = response.data.approvalUrl;
  };

  return (
    <div className="card">
      <h2>Group Payment</h2>
      
      {!status && (
        <div>
          <h3>Set Payment Target</h3>
          <input
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="Target amount"
          />
          <button onClick={handleSetTarget}>Set Target</button>
        </div>
      )}

      {status && (
        <>
          <div>
            <p>Target: £{status.targetAmount}</p>
            <p>Committed: £{status.totalCommitted}</p>
            <p>Remaining: £{status.remaining}</p>
            <p>Progress: {status.progress}%</p>
          </div>

          <div>
            <h3>Your Contribution</h3>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Your share"
            />
            <button onClick={handleCommit}>Commit</button>
          </div>

          {status.totalCommitted >= status.targetAmount && (
            <button onClick={handleCreatePayment}>
              Create Payment (£{status.targetAmount})
            </button>
          )}

          <div>
            <h3>Contributions</h3>
            {status.contributions.map((contrib, idx) => (
              <div key={idx}>
                {contrib.userName}: £{contrib.amount}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
```

---

## ⚠️ Legal Compliance Notes

### What This System Does:
- ✅ Tracks commitments (virtual)
- ✅ Shows progress
- ✅ Coordinates payment
- ✅ Creates single PayPal payment
- ✅ **Never holds money**

### What This System Does NOT Do:
- ❌ Hold money in your account
- ❌ Create a wallet
- ❌ Store actual funds
- ❌ Act as escrow

### Money Flow:
```
User commits £25 → Database tracks commitment
User commits £25 → Database tracks commitment
User commits £25 → Database tracks commitment
User commits £25 → Database tracks commitment
All committed → Create PayPal payment
Owner approves → PayPal processes £100 → Merchant receives £100
```

**You never touch the money - it goes directly from users to merchant via PayPal.**

---

## 🚀 Next Steps

1. **Test the API endpoints**
2. **Create frontend component** (see example above)
3. **Integrate with SharedAccounts page**
4. **Add payment status display**
5. **Handle PayPal redirects**

---

## 📋 Database Schema

The `SharedAccount` model now includes:

```javascript
groupPayment: {
  targetAmount: Number,        // Total amount needed
  totalCommitted: Number,      // Sum of all commitments
  status: String,              // pending, payment_created, completed, cancelled
  paymentId: String,           // PayPal payment ID
  description: String,         // Payment description
  contributions: [{
    userId: ObjectId,          // Who committed
    amount: Number,            // How much they committed
    description: String,       // Optional description
    contributionId: String,   // Unique ID
    status: String,           // committed, paid, etc.
    committedAt: Date
  }]
}
```

---

**This implementation is legal because you're tracking commitments, not holding money!**

