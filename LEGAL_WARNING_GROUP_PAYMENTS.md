# ⚠️ CRITICAL LEGAL WARNING: Group Payment Feature

> **CURRENT STATUS (marketing-alignment Phase 9):** This warning still correctly advises against custodial pooled wallets. The live SHARE Trip Money prototype remains **non-custodial ledger tracking** and does not hold customer deposits. Do not read this file as describing a live pooled-funds product.

## 🚨 Your Proposed Feature Requires a License

### What You Want to Build:
- Users deposit money into a shared account in your app
- Money is held in your system
- You make a single payment from the pooled funds

### Legal Status: ❌ **REQUIRES LICENSE**

This is **NOT** payment facilitation - this is:
- **Money holding** (escrow)
- **Electronic money issuance** (e-money)
- **Wallet operation**

**This requires:**
- **UK**: EMI (Electronic Money Institution) License
- **US**: Money Transmitter License (state-by-state)

**Without a license, this is ILLEGAL.**

---

## ✅ Legal Alternative: PayPal Group Payments

Instead of holding money yourself, use PayPal's built-in features:

### Option 1: PayPal Money Pools (Recommended)
- PayPal handles the money holding
- Users contribute to a PayPal pool
- PayPal makes the payment when ready
- **You don't hold any money**
- **No license needed**

### Option 2: Split Payment Tracking
- Track contributions in your database (virtual)
- When everyone has "contributed" (virtually)
- Create a single PayPal payment
- Each person pays their share directly to the merchant
- **You never hold money**
- **No license needed**

### Option 3: PayPal Payouts API
- Each person pays their share to you via PayPal
- You immediately forward it to the merchant
- Money never sits in your account
- **Still risky - may require license**

---

## 🎯 Recommended Implementation

### Virtual Account System (Legal)

**How it works:**
1. User A "commits" £25 (tracked in database only)
2. User B "commits" £25 (tracked in database only)
3. User C "commits" £25 (tracked in database only)
4. User D "commits" £25 (tracked in database only)
5. When all committed, create ONE PayPal payment
6. Each person pays their share directly to PayPal
7. PayPal processes the full £100 payment
8. **You never hold money**

**Implementation:**
- Track "commitments" in database
- Show virtual balance
- When ready, create PayPal payment
- Each person pays their portion
- Money flows: Users → PayPal → Merchant
- **You're just the coordinator**

---

## ⚠️ What You CANNOT Do

### ❌ Illegal Without License:
- Hold money in your bank account
- Create a wallet where users deposit funds
- Hold funds for more than a few seconds
- Act as intermediary holding money

### ✅ Legal Without License:
- Track who committed to pay
- Calculate shares
- Coordinate payments
- Use PayPal to process payments
- Show virtual balances (not real money)

---

## 💡 Implementation Options

I can help you build:

1. **Virtual Account System** (Recommended - Legal)
   - Track commitments in database
   - Show virtual balances
   - Create single PayPal payment when ready
   - Each person pays directly

2. **PayPal Money Pools Integration** (If available)
   - Use PayPal's group payment feature
   - They handle money holding
   - You provide the interface

3. **Split Payment Coordination** (Legal)
   - Track who needs to pay what
   - Send payment links to each person
   - They pay directly to merchant
   - You coordinate, don't hold

---

## 🚨 Legal Consequences

If you hold money without a license:

**UK:**
- Fines: Up to £5,000,000
- Criminal charges
- Business closure
- Director liability

**US:**
- Fines: Up to $1,000,000 per violation
- Criminal charges (felony)
- Business closure
- Personal liability

---

## 📋 Next Steps

1. **Decide**: Do you want to get licensed? (6-12 months, £500,000+)
2. **OR**: Use virtual account system (legal, no license)
3. **OR**: Use PayPal's group payment features

**I recommend Option 2 (Virtual Account System)** - it gives you the functionality you want without requiring a license.

---

**Would you like me to implement the Virtual Account System?** It will:
- Track contributions (virtual)
- Show balances (virtual)
- Coordinate single payment
- Never hold real money
- Be completely legal

