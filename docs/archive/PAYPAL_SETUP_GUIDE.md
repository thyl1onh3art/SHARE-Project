# PayPal Payment Integration Setup Guide

## ✅ Backend Setup Complete

The PayPal payment integration has been implemented. Here's what was added:

### Files Created/Updated:
- `backend/controllers/paymentController.js` - PayPal payment processing logic
- `backend/routes/paymentRoutes.js` - PayPal API routes
- `frontend/src/components/Payment.tsx` - PayPal payment component

### Dependencies:
- Backend: `paypal-rest-sdk`
- Frontend: `@paypal/react-paypal-js`

---

## 🔑 Step 1: Get PayPal API Credentials

1. **Create PayPal Business Account**
   - Go to https://www.paypal.com/business
   - Sign up for a business account
   - Complete business verification (required for live payments)

2. **Get API Credentials**
   - Go to https://developer.paypal.com
   - Log in with your PayPal account
   - Go to Dashboard → My Apps & Credentials
   - Click "Create App"
   - Name your app (e.g., "SHARE Project")
   - Select environment: **Sandbox** (for testing) or **Live** (for production)
   - Copy your **Client ID** and **Secret**

3. **Sandbox vs Live**
   - **Sandbox**: For testing (use sandbox credentials)
   - **Live**: For production (use live credentials after verification)

---

## 🔧 Step 2: Configure Environment Variables

### Backend (.env file)

Add these to your `backend/.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_client_secret_here
PAYPAL_MODE=sandbox  # or 'live' for production
FRONTEND_URL=http://localhost:3000  # Your frontend URL
```

### Frontend (.env file)

Add this to your `frontend/.env` file:

```env
# PayPal Client ID (safe to expose in frontend)
REACT_APP_PAYPAL_CLIENT_ID=your_client_id_here
```

### Railway Environment Variables

1. Go to Railway dashboard
2. Select your **backend** service
3. Go to **Variables** tab
4. Add:
   - `PAYPAL_CLIENT_ID` = Your PayPal Client ID
   - `PAYPAL_CLIENT_SECRET` = Your PayPal Secret
   - `PAYPAL_MODE` = `sandbox` (or `live` for production)
   - `FRONTEND_URL` = Your frontend URL

5. Select your **frontend** service
6. Go to **Variables** tab
7. Add:
   - `REACT_APP_PAYPAL_CLIENT_ID` = Your PayPal Client ID

---

## 🧪 Step 3: Test the Integration

### Test Mode (Sandbox)

PayPal provides test accounts:

1. **Go to PayPal Developer Dashboard**
   - https://developer.paypal.com
   - Go to Dashboard → Sandbox → Accounts
   - Use the default test accounts or create new ones

2. **Test Accounts**
   - **Buyer Account**: Use to test payments
   - **Seller Account**: Your business account

### Test Payment Flow

1. **Start your backend server**
   ```bash
   cd backend
   npm start
   ```

2. **Start your frontend**
   ```bash
   cd frontend
   npm start
   ```

3. **Use the Payment component**
   ```tsx
   import Payment from './components/Payment';
   
   <Payment
     amount={100.00}
     currency="GBP"
     description="Test payment"
     onSuccess={(payment) => {
       console.log('Payment succeeded!', payment);
     }}
     onError={(error) => {
       console.error('Payment failed:', error);
     }}
   />
   ```

4. **Test Payment**
   - Click PayPal button
   - You'll be redirected to PayPal (sandbox)
   - Log in with test account
   - Approve payment
   - You'll be redirected back to your app

---

## 📡 Step 4: PayPal Payment Flow

### How It Works:

1. **User clicks PayPal button**
   - Frontend calls `/api/payments/create`
   - Backend creates PayPal payment
   - Returns payment ID and approval URL

2. **User approves on PayPal**
   - User redirected to PayPal
   - Logs in and approves payment
   - PayPal redirects back with `paymentId` and `payerId`

3. **Execute payment**
   - Frontend calls `/api/payments/execute`
   - Backend executes payment with PayPal
   - Payment is completed

---

## 🚀 Step 5: API Endpoints

### Available Endpoints

#### 1. Create PayPal Payment
```http
POST /api/payments/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100.00,
  "currency": "GBP",
  "description": "Payment description",
  "returnUrl": "https://your-app.com/payment/success",
  "cancelUrl": "https://your-app.com/payment/cancel"
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "PAY-xxx",
  "transactionId": "txn_xxx",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=xxx",
  "amount": 100.00,
  "currency": "GBP"
}
```

#### 2. Execute Payment
```http
POST /api/payments/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentId": "PAY-xxx",
  "payerId": "xxx"
}
```

**Response:**
```json
{
  "success": true,
  "status": "approved",
  "payment": {
    "id": "PAY-xxx",
    "state": "approved",
    "amount": "100.00",
    "currency": "GBP",
    "transactionId": "txn_xxx"
  }
}
```

#### 3. Get Payment Details
```http
GET /api/payments/:paymentId
Authorization: Bearer <token>
```

#### 4. Get Payment History
```http
GET /api/payments/history?limit=10
Authorization: Bearer <token>
```

#### 5. Refund Payment
```http
POST /api/payments/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentId": "PAY-xxx",
  "amount": 100.00,
  "currency": "GBP"
}
```

---

## 💡 Usage Examples

### Example 1: Simple Payment Component

```tsx
import Payment from './components/Payment';

function Checkout() {
  const handleSuccess = (payment) => {
    console.log('Payment successful!', payment);
    // Redirect to success page
    // Update your database
    // Send confirmation email
  };

  const handleError = (error) => {
    console.error('Payment failed:', error);
    // Show error message to user
  };

  return (
    <Payment
      amount={50.00}
      currency="GBP"
      description="Event ticket purchase"
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}
```

### Example 2: Payment in Shared Account

```tsx
function SharedAccountPayment({ accountId, amount }) {
  const handleSuccess = async (payment) => {
    // Update shared account balance
    await axios.post('/shared-accounts/add-funds', {
      accountId,
      amount,
      transactionId: payment.transactionId
    });
  };

  return (
    <Payment
      amount={amount}
      currency="GBP"
      description={`Contribution to shared account`}
      onSuccess={handleSuccess}
    />
  );
}
```

---

## 🔒 Security Best Practices

### ✅ Implemented:
- ✅ PayPal handles all payment processing (never store card data)
- ✅ User authentication required
- ✅ Transaction logging
- ✅ Amount validation
- ✅ Payment verification

### ⚠️ TODO (Before Production):
- [ ] Add transaction limits (daily/weekly/monthly)
- [ ] Implement fraud detection
- [ ] Add velocity checks
- [ ] Store transactions in database
- [ ] Implement PayPal IPN (Instant Payment Notification)
- [ ] Add comprehensive audit logging
- [ ] Set up monitoring and alerts

---

## 📊 Transaction Logging

Currently, transactions are logged to console. **Before production**, you should:

1. **Create Transaction Model**
```javascript
// backend/models/mongoose/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'GBP' },
  status: { type: String, enum: ['pending', 'approved', 'failed', 'refunded'], default: 'pending' },
  description: String,
  payerId: String,
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
  error: String
});

module.exports = mongoose.model('Transaction', transactionSchema);
```

2. **Update Payment Controller**
   - Uncomment the TODO sections
   - Import and use Transaction model
   - Save all transactions to database

---

## 🔔 PayPal IPN (Instant Payment Notification)

For production, set up PayPal IPN to receive payment notifications:

1. **Go to PayPal Developer Dashboard**
   - My Apps & Credentials → Your App → Webhooks
   - Add webhook URL: `https://your-backend.com/api/payments/ipn`

2. **Implement IPN Handler**
   - PayPal sends POST requests to your IPN URL
   - Verify IPN signature
   - Update transaction status in database

---

## 🐛 Troubleshooting

### Issue: "PayPal client ID is not configured"
- **Solution**: Check that `REACT_APP_PAYPAL_CLIENT_ID` is set correctly
- **Solution**: Restart frontend server after adding env variable

### Issue: "Payment creation failed"
- **Solution**: Check PayPal credentials are correct
- **Solution**: Verify `PAYPAL_MODE` is set to `sandbox` for testing
- **Solution**: Check PayPal Developer Dashboard for error details

### Issue: "Payment execution failed"
- **Solution**: Ensure payment was approved on PayPal
- **Solution**: Check payment ID and payer ID are correct
- **Solution**: Verify payment hasn't already been executed

### Issue: CORS errors
- **Solution**: Add your frontend domain to PayPal allowed origins
- **Solution**: Check backend CORS configuration

---

## 📚 Resources

- **PayPal Developer Docs**: https://developer.paypal.com/docs
- **PayPal REST API**: https://developer.paypal.com/docs/api/overview
- **PayPal React Components**: https://developer.paypal.com/docs/business/javascript-sdk/javascript-sdk-reference
- **PayPal Testing**: https://developer.paypal.com/docs/api-basics/sandbox
- **PCI Compliance**: PayPal handles this for you

---

## ✅ Next Steps

1. ✅ PayPal integration complete
2. ⏳ Get PayPal API credentials
3. ⏳ Configure environment variables
4. ⏳ Test with sandbox accounts
5. ⏳ Set up PayPal IPN (for production)
6. ⏳ Create Transaction model
7. ⏳ Add transaction limits
8. ⏳ Implement fraud detection
9. ⏳ Complete business verification
10. ⏳ Go live!

---

## 🆚 PayPal vs Stripe

### PayPal Advantages:
- ✅ Widely trusted by users
- ✅ Users can pay with PayPal balance (no card needed)
- ✅ Lower fees for some transactions
- ✅ Good for international payments

### Considerations:
- ⚠️ Users redirected to PayPal (less seamless than Stripe)
- ⚠️ More complex integration
- ⚠️ Different API structure

---

**Remember**: Always test thoroughly in sandbox mode before going live!

