# Frontend ID Reference

## Frontend Service ID
**ID:** `cdb501cc-22d9-4f10-bf80-3a2b9de3ca00`

## Possible Uses

This ID might be needed for:

### 1. Railway Service Identification
- Railway service UUID
- Used internally by Railway for service management
- Can be found in Railway dashboard URL or service details

### 2. Environment Variable
If this needs to be set as an environment variable:
- **Settings** → **Variables** → Add:
  ```
  RAILWAY_SERVICE_ID=cdb501cc-22d9-4f10-bf80-3a2b9de3ca00
  ```
  OR
  ```
  FRONTEND_SERVICE_ID=cdb501cc-22d9-4f10-bf80-3a2b9de3ca00
  ```

### 3. Backend Configuration
If backend needs to reference frontend service:
- Check backend environment variables
- CORS configuration might need this
- API endpoint configuration

### 4. Railway CLI
If using Railway CLI:
```bash
railway service
# Select service with this ID
```

## Where to Find This ID

1. **Railway Dashboard:**
   - Frontend Service → Settings
   - Look in URL: `railway.app/service/[ID]`
   - Service details page

2. **Railway API:**
   - Service metadata
   - Deployment information

## Next Steps

Please clarify what you need to do with this ID:
- Set it as an environment variable?
- Configure it in backend?
- Use it in Railway settings?
- Something else?

Let me know and I can help configure it properly!

