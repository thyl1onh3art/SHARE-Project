# Debug Registration Validation Error

## 🔍 How to See the Exact Error

The "Validation failed" message is generic. To see the **specific validation errors**, follow these steps:

### Step 1: Open Browser DevTools
1. Press **F12** (or right-click → Inspect)
2. Click the **Network** tab
3. Make sure the network log is recording (red circle should be active)

### Step 2: Try Registering Again
1. Fill out the registration form
2. Click "Register"
3. The request will appear in the Network tab

### Step 3: Check the Error Response
1. In the Network tab, find the request: `register` or `/api/users/register`
2. Click on it
3. Go to the **Response** tab
4. You'll see the exact validation errors like:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "password",
      "message": "Password must be at least 8 characters long",
      "value": "test123"
    }
  ]
}
```

## 🎯 Common Validation Errors

### Password Issues
- ❌ **"Password must be at least 8 characters long"**
  - Fix: Use 8+ characters (e.g., `Test1234`)

- ❌ **"Password must contain at least one uppercase letter, one lowercase letter, and one number"**
  - Fix: Include A-Z, a-z, and 0-9 (e.g., `MyPass123`)

### Name Issues
- ❌ **"Name must be between 2 and 50 characters"**
  - Fix: Ensure name is 2-50 characters

### Age Issues
- ❌ **"Age must be between 13 and 120"**
  - This shouldn't happen if ageGroup is selected
  - The frontend converts ageGroup to age automatically

## ✅ Quick Test

Try registering with this data:
- **Full Name**: "richard brown" ✓
- **Email**: "test@example.com" ✓
- **Age Group**: Any selection ✓
- **Interests**: At least one selected ✓
- **Password**: `Test1234` (8+ chars, uppercase, lowercase, number) ✓

## 🚀 After Redeploy

Once you redeploy the backend and frontend:
1. The password field will show requirements
2. Error messages will be more specific
3. Validation will accept `ageGroup` properly

## 📝 Next Steps

1. **Check Network tab** to see exact error
2. **Redeploy backend** with validation fixes
3. **Redeploy frontend** with password hint
4. **Test again** with a valid password

