# AXIOM NFT Page - Troubleshooting Guide

## Common Console Errors & Solutions

### 1. ✅ Fixed: "Expected to find result for path [object Object]"

**Status**: ✅ **FIXED**
- **Cause**: Invalid token ID in URL path
- **Solution**: Added token ID validation and automatic redirect
- **Fix Applied**: Token ID now validated (1-5), invalid IDs redirect to AXIOM #1

### 2. ⚠️ Browser Extension Errors (Can be ignored)

#### "Invalid asm.js: Unexpected token" from `solanaActionsContentScript.js`
- **Source**: Solana wallet browser extension (Phantom, etc.)
- **Impact**: None - this is a browser extension issue, not our code
- **Solution**: Can be safely ignored, or disable Solana wallet extension if not needed

#### "GET https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/.well-known/ii-alternative-origins 404"
- **Source**: Internet Identity or wallet extension trying to access a canister
- **Impact**: None - this is a 404 for a canister that doesn't exist
- **Solution**: Can be safely ignored

### 3. ⚠️ Permission Error: "fetch_canister_logs"

**Error**: `Caller 2vxsx-fae is not allowed to access canister logs`

- **Source**: IC Dashboard or browser extension trying to fetch canister logs
- **Impact**: None - this is a permission issue, not a functionality issue
- **Solution**: 
  - This error comes from browser extensions or dev tools
  - Can be safely ignored
  - The AXIOM NFT page works correctly despite this error

---

## ✅ Fixes Applied

### 1. Token ID Validation
- ✅ Validates token ID is between 1-5
- ✅ Automatically redirects invalid IDs to AXIOM #1
- ✅ Prevents routing errors

### 2. Error Handling
- ✅ Added proper error states
- ✅ Error UI with retry button
- ✅ Graceful fallbacks for failed API calls

### 3. Host Configuration
- ✅ Uses `getICHost()` for proper mainnet/localhost detection
- ✅ Only fetches root key in development
- ✅ Proper agent configuration

### 4. Ownership Verification
- ✅ Wrapped in try-catch to prevent errors from blocking page load
- ✅ Gracefully handles authentication failures

---

## Testing the Fix

### Test Valid URLs:
1. ✅ `/axiom/1` - Should load AXIOM #1
2. ✅ `/axiom/2` - Should load AXIOM #2
3. ✅ `/axiom/3` - Should load AXIOM #3
4. ✅ `/axiom/4` - Should load AXIOM #4
5. ✅ `/axiom/5` - Should load AXIOM #5

### Test Invalid URLs (should redirect):
- `/axiom/0` → Redirects to `/axiom/1`
- `/axiom/6` → Redirects to `/axiom/1`
- `/axiom/invalid` → Redirects to `/axiom/1`

---

## Browser Extension Errors (Safe to Ignore)

These errors come from browser extensions and don't affect functionality:

1. **Solana Wallet Extension**: `solanaActionsContentScript.js` errors
   - **Action**: Can be ignored or disable Solana wallet if not using it

2. **Internet Identity**: 404 errors for `.well-known/ii-alternative-origins`
   - **Action**: Can be ignored - this is normal

3. **IC Dashboard/Dev Tools**: `fetch_canister_logs` permission errors
   - **Action**: Can be ignored - requires special permissions

---

## If Page Still Doesn't Load

### Check 1: Canister Status
```bash
dfx canister --network ic status 46odg-5iaaa-aaaao-a4xqa-cai
```

### Check 2: Browser Console
- Look for actual errors (not warnings from extensions)
- Check network tab for failed requests

### Check 3: Authentication
- Ensure you're authenticated if trying to verify ownership
- Anonymous users can still view NFT metadata

### Check 4: Network
- Ensure you're on mainnet (not localhost)
- Check if canister is accessible via IC Dashboard

---

## Quick Fixes

### Suppress Browser Extension Errors (Optional)

Add to `frontend/src/main.tsx`:

```typescript
// Suppress known browser extension errors
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (
    message.includes('solanaActionsContentScript') ||
    message.includes('asm.js') ||
    message.includes('fetch_canister_logs') ||
    message.includes('ii-alternative-origins')
  ) {
    // Suppress browser extension errors
    return;
  }
  originalError.apply(console, args);
};
```

---

## Expected Behavior

✅ **Page should load** even with browser extension errors in console
✅ **Metadata should display** correctly
✅ **Chat should work** if canister is accessible
✅ **Ownership verification** should work if authenticated

---

## Status

- ✅ Routing fixed
- ✅ Error handling improved
- ✅ Token ID validation added
- ✅ Host configuration fixed
- ⚠️ Browser extension errors (safe to ignore)

**The page should now work correctly despite the console warnings from browser extensions.**

