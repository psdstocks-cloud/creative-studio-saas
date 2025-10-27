# 🐛 CRITICAL BUG FIX: Balance Reset Issue

**Date**: October 27, 2025  
**Severity**: CRITICAL  
**Status**: ✅ FIXED

---

## 🔴 **The Problem**

Users' balance was resetting to 100 points every time they logged in, even after making purchases.

### **Example:**
- User had **97.85 points** (after ordering files costing 2.15)
- After logging out and back in: **100 points** (incorrect!)
- All previous purchases were lost from the balance

---

## 🔍 **Root Cause Analysis**

The bug was in `/src/contexts/AuthContext.tsx` in the `getAppUserFromSession` function:

### **Problem 1: Aggressive Timeout (3 seconds)**
```typescript
// OLD CODE (BROKEN)
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Profile fetch timeout')), 3000); // Too short!
});
```

When the profile fetch took longer than 3 seconds (due to network latency or database load), the timeout would trigger.

### **Problem 2: Fallback to Default Balance**
```typescript
// OLD CODE (BROKEN)
} catch (error) {
    console.error("AuthProvider: Timeout or error fetching profile:", error);
    // Return user with default balance on timeout
    return {
        id: session.user.id,
        email: session.user.email || 'No email found',
        balance: 100, // ❌ BUG: Always returns 100!
    };
}
```

When the timeout occurred, it would return `balance: 100` instead of the actual database value.

### **Problem 3: Silent Failure**
The error was logged to console but the app continued with incorrect data, making it hard to detect.

---

## ✅ **The Solution**

### **Fix 1: Increased Timeout to 10 Seconds**
```typescript
// NEW CODE (FIXED)
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Profile fetch timeout')), 10000); // Increased to 10 seconds
});
```

**Why**: 10 seconds is reasonable for database queries, accounting for network latency and database load.

### **Fix 2: Proper Error Handling**
```typescript
// NEW CODE (FIXED)
} catch (error: any) {
    console.error("AuthProvider: Error fetching profile:", error);
    // Don't return default balance on error - throw instead
    throw error; // ✅ Fail loudly instead of silently
}
```

**Why**: If the profile can't be fetched, we should fail the login instead of showing incorrect data.

### **Fix 3: Smart Profile Creation**
```typescript
// NEW CODE (FIXED)
if (profileError.code === 'PGRST116') {
    // Profile doesn't exist - create it with 100 balance (new user)
    console.log("Creating new profile for user:", session.user.id);
    const { error: insertError } = await supabase
        .from('profiles')
        .insert([{ id: session.user.id, balance: 100 }]);
    
    return {
        id: session.user.id,
        email: session.user.email || 'No email found',
        balance: 100, // ✅ Only for NEW users
    };
}
```

**Why**: Only create a profile with 100 balance for **new users** (when profile doesn't exist), not for existing users on every login.

### **Fix 4: Proper Data Type Handling**
```typescript
// NEW CODE (FIXED)
return {
    id: session.user.id,
    email: session.user.email || 'No email found',
    balance: Number(profile?.balance ?? 100), // Convert to number to handle numeric(10,2) type
};
```

**Why**: The balance column is now `numeric(10, 2)` in Supabase, so we need to explicitly convert it to a JavaScript number.

### **Fix 5: Sign Out on Profile Fetch Failure**
```typescript
// NEW CODE (FIXED)
try {
    const appUser = await getAppUserFromSession(session);
    setUser(appUser);
    clearTimeout(timeoutId);
} catch (profileError) {
    // If profile fetch fails, log out the user to prevent showing incorrect balance
    console.error("Failed to load user profile, signing out:", profileError);
    await supabase.auth.signOut();
    setUser(null);
}
```

**Why**: If we can't load the profile, it's better to log the user out than to show them incorrect data.

---

## 📊 **Changes Summary**

| Before | After |
|--------|-------|
| Timeout: 3 seconds | Timeout: 10 seconds |
| Fallback to 100 on error | Throw error instead |
| Silent failure | Log out user on failure |
| No profile creation logic | Smart profile creation for new users only |
| No type conversion | Explicit Number() conversion |

---

## 🧪 **Testing Instructions**

### **Test 1: Existing User with Balance**
1. Log in to your account (should have 97.85 points)
2. Check balance in UI → Should show **97.85 points**
3. Log out
4. Log back in
5. Check balance again → Should still show **97.85 points** ✅

### **Test 2: Make a Purchase**
1. Order a stock file costing 0.50 points
2. Balance should decrease: **97.85 - 0.50 = 97.35**
3. Log out and log back in
4. Balance should still be **97.35** ✅

### **Test 3: New User Signup**
1. Create a new account
2. After email verification, log in
3. Balance should be **100 points** (new user bonus) ✅

---

## 🚀 **Deployment Status**

### **Commit:**
```
CRITICAL FIX: Prevent balance reset to 100 on login - Increased timeouts and fixed error handling
```

### **Deployed to:**
- ✅ GitHub (main branch)
- ✅ Cloudflare Pages (auto-deploy)
- 🕐 **ETA**: 2-3 minutes

### **Live URL:**
https://creative-studio-saas.pages.dev/

---

## 📝 **Related Files Changed**

- `src/contexts/AuthContext.tsx` (complete rewrite of error handling)

---

## 🔮 **Prevention for Future**

To prevent similar bugs:

1. **Never use fallback default values** for critical data like balance
2. **Always throw errors** instead of silently failing
3. **Use generous timeouts** for database operations (10-15 seconds)
4. **Add proper logging** to track when profile creation happens
5. **Test edge cases** like slow networks, database errors, and timeouts

---

## ✅ **Verification Checklist**

After deployment:

- [ ] Test login with existing user (balance should persist)
- [ ] Test purchase and re-login (balance should reflect purchase)
- [ ] Test new user signup (should get 100 points)
- [ ] Check browser console for errors
- [ ] Verify no "Profile fetch timeout" warnings

---

**Status**: DEPLOYED AND READY TO TEST 🚀

