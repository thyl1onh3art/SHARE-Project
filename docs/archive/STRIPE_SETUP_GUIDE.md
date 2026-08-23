# Stripe Payment Integration Setup Guide

## ✅ Backend Setup Complete

The Stripe payment integration has been implemented in the backend. Here's what was added:

### Files Created:
- `backend/controllers/paymentController.js` - Payment processing logic
- `backend/routes/paymentRoutes.js` - Payment API routes
- `frontend/src/components/Payment.tsx` - Payment form component

### Files Modified:
- `backend/app.js` - Added payment routes and webhook endpoint
- `backend/package.json` - Added `stripe` dependency
- `frontend/package.json` - Added `@stripe/stripe-js` and `@stripe/react-stripe-js`

---

## 🔑 Step 1: Get Stripe API Keys

1. **Create Stripe Account**
   - Go to https://stripe.com
   - Sign up for an account
   - Complete business verification (required for live payments)

2. **Get API Keys**
   - Go to Dashboard → Developers → API keys
   - Copy your **Publishable key** (starts with `pk_test_` for test mode)
   - Copy your **Secret key** (starts with `sk_test_` for test mode)
   - **Keep secret key secure - never commit to Git!**

3. **Get Webhook Secret** (for production)
   - Go to Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/payments/webhook`
   - Copy the **Signing secret** (starts with `whsec_`)

---

## 🔧 Step 2: Configure Environment Variables

### Backend (.env file)

Add these to your `backend/.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Frontend (.env file)

Add this to your `frontend/.env` file:

```env
# Stripe Publishable Key (safe to expose in frontend)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### Railway Environment Variables

1. Go to Railway dashboard
2. Select your **backend** service
3. Go to **Variables** tab
4. Add:
   - `STRIPE_SECRET_KEY` = `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...` (for production)

5. Select your **frontend** service
6. Go to **Variables** tab
7. Add:
   - `REACT_APP_STRIPE_PUBLISHABLE_KEY` = `pk_test_...`

---

## 🧪 Step 3: Test the Integration

### Test Mode

Stripe provides test card numbers:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use any:
- **Expiry**: Future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

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
     currency="gbp"
     description="Test payment"
     onSuccess={(paymentIntent) => {
       console.log('Payment succeeded!', paymentIntent);
     }}
     onError={(error) => {
       console.error('Payment failed:', error);
     }}
   />
   ```

---

## 📡 Step 4: Configure Webhooks (Production)

### Local Testing with Stripe CLI

1. **Install Stripe CLI**
   - Download from https://stripe.com/docs/stripe-cli
   - Or: `brew install stripe/stripe-cli/stripe` (Mac)

2. **Login to Stripe**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```
   This will give you a webhook signing secret (starts with `whsec_`)

4. **Use the webhook secret in your .env**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Production Webhook Setup

1. **Go to Stripe Dashboard**
   - Developers → Webhooks
   - Click "Add endpoint"

2. **Configure Endpoint**
   - URL: `https://your-backend-domain.com/api/payments/webhook`
   - Events to listen to:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`

3. **Get Webhook Secret**
   - After creating endpoint, click on it
   - Copy the "Signing secret"
   - Add to Railway environment variables

---

## 🚀 Step 5: API Endpoints

### Available Endpoints

#### 1. Create Payment Intent
```http
POST /api/payments/create-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100.00,
  "currency": "gbp",
  "description": "Payment description"
}
```

**Response:**
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "transactionId": "txn_xxx",
  "amount": 100.00,
  "currency": "gbp"
}
```

#### 2. Confirm Payment
```http
POST /api/payments/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_xxx"
}
```

#### 3. Get Payment History
```http
GET /api/payments/history?limit=10
Authorization: Bearer <token>
```

#### 4. Cancel Payment
```http
POST /api/payments/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_xxx"
}
```

#### 5. Webhook (Stripe → Your Server)
```http
POST /api/payments/webhook
Stripe-Signature: <signature>
Content-Type: application/json

<Stripe event payload>
```

---

## 💡 Usage Examples

### Example 1: Simple Payment Component

```tsx
import Payment from './components/Payment';

function Checkout() {
  const handleSuccess = (paymentIntent) => {
    console.log('Payment successful!', paymentIntent);
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
      currency="gbp"
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
  const handleSuccess = async (paymentIntent) => {
    // Update shared account balance
    await axios.post('/shared-accounts/add-funds', {
      accountId,
      amount,
      transactionId: paymentIntent.id
    });
  };

  return (
    <Payment
      amount={amount}
      description={`Contribution to shared account`}
      onSuccess={handleSuccess}
    />
  );
}
```

---

## 🔒 Security Best Practices

### ✅ Implemented:
- ✅ Payment intents (never store card data)
- ✅ Webhook signature verification
- ✅ User authentication required
- ✅ Transaction logging
- ✅ Amount validation

### ⚠️ TODO (Before Production):
- [ ] Add transaction limits (daily/weekly/monthly)
- [ ] Implement fraud detection
- [ ] Add velocity checks
- [ ] Store transactions in database
- [ ] Implement idempotency keys
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
  paymentIntentId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'gbp' },
  status: { type: String, enum: ['pending', 'succeeded', 'failed', 'canceled'], default: 'pending' },
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
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

## 🐛 Troubleshooting

### Issue: "Stripe not loaded"
- **Solution**: Check that `REACT_APP_STRIPE_PUBLISHABLE_KEY` is set correctly
- **Solution**: Ensure Stripe script loads before using Payment component

### Issue: "Webhook signature verification failed"
- **Solution**: Check `STRIPE_WEBHOOK_SECRET` is correct
- **Solution**: Ensure webhook endpoint uses raw body (already configured)

### Issue: "Payment failed" with test card
- **Solution**: Use correct test card numbers (see Step 3)
- **Solution**: Check Stripe dashboard for error details

### Issue: CORS errors
- **Solution**: Add your frontend domain to Stripe allowed origins
- **Solution**: Check backend CORS configuration

---

## 📚 Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe React Components**: https://stripe.com/docs/stripe-js/react
- **Stripe Testing**: https://stripe.com/docs/testing
- **Stripe Webhooks**: https://stripe.com/docs/webhooks
- **PCI Compliance**: https://stripe.com/docs/security/guide

---

## ✅ Next Steps

1. ✅ Stripe integration complete
2. ⏳ Get Stripe API keys
3. ⏳ Configure environment variables
4. ⏳ Test with test cards
5. ⏳ Set up webhooks
6. ⏳ Create Transaction model
7. ⏳ Add transaction limits
8. ⏳ Implement fraud detection
9. ⏳ Complete business verification
10. ⏳ Go live!

---

**Remember**: Always test thoroughly in test mode before going live!

