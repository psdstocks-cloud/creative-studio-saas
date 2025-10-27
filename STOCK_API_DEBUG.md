# 🐛 Stock Downloader API Debugging Guide

**Date**: October 27, 2025  
**Issue**: Dreamstime URL showing "Could not retrieve file details"

---

## 📊 Current Status

### ✅ **Frontend is Working**
- Cloudflare deployment successful
- App loads without errors
- URL parsing is correct

### 🔍 **What We Added**
Added comprehensive debug logging to track API calls:
- `🔍 Parsing URL:` - Shows the input URL
- `✅ Parsed:` - Shows extracted site and ID
- `📞 Calling API:` - Shows the API endpoint being called
- `🌐 API Request:` - Full request URL and method
- `📡 API Response:` - HTTP status code
- `✅ API Success:` - Successful response data
- `❌ API Error Data:` - Error details from API
- `🔥 API Fetch Error:` - Client-side errors

---

## 🧪 **Testing Instructions**

### **Step 1: Wait for Deployment** (2-3 minutes)
Go to: https://dash.cloudflare.com
- Navigate to **Workers & Pages** → **creative-studio-saas** → **Deployments**
- Wait for commit: `"Add: Debug logging for stock API calls"`

### **Step 2: Test with Console Open**
1. Visit: https://creative-studio-saas.pages.dev/
2. Sign in to your account
3. Navigate to **Stock Downloader**
4. Open browser DevTools (Press **F12**)
5. Go to **Console** tab
6. Clear the console (🚫 icon or `Ctrl/Cmd + K`)

### **Step 3: Test Both URLs**

#### **Test 1: Shutterstock (Should Work)**
```
https://www.shutterstock.com/image-vector/heart-logo-love-medical-romance-charity-2365327491
```

**Expected Console Output:**
```
🔍 Parsing URL: https://www.shutterstock.com/image-vector/heart-logo-love-medical-romance-charity-2365327491
✅ Parsed: {site: 'shutterstock', id: '2365327491'}
📞 Calling API: /stockinfo/shutterstock/2365327491
🌐 API Request: GET https://nehtw.com/api/stockinfo/shutterstock/2365327491
📡 API Response: 200 OK
✅ API Success: {data: {...}}
```

#### **Test 2: Dreamstime (Currently Failing)**
```
https://www.dreamstime.com/plant-s-root-system-visible-close-up-thriving-bed-nutrient-rich-soil-image377059337
```

**Expected Console Output:**
```
🔍 Parsing URL: https://www.dreamstime.com/plant-s-root-system-visible-close-up-thriving-bed-nutrient-rich-soil-image377059337
✅ Parsed: {site: 'dreamstime', id: '377059337'}
📞 Calling API: /stockinfo/dreamstime/377059337
🌐 API Request: GET https://nehtw.com/api/stockinfo/dreamstime/377059337
📡 API Response: XXX (Status code here)
❌ API Error Data: {...} (Or ✅ if successful)
```

### **Step 4: Copy Console Output**
Once you test both URLs:
1. Right-click in the console
2. Select **Save as...** or **Export**
3. Send me the console output

OR

Just take a screenshot of the console showing the logs.

---

## 🔍 **What the Logs Will Tell Us**

### **Scenario A: Parsing Fails**
If you see:
```
❌ Error: Could not parse the stock media ID from the URL
```
→ The regex pattern needs adjustment (unlikely based on our test)

### **Scenario B: API Returns Error**
If you see:
```
📡 API Response: 400 Bad Request
❌ API Error Data: {message: "Invalid site or ID"}
```
→ The external API (`nehtw.com`) doesn't support this Dreamstime file

### **Scenario C: API Returns Empty Data**
If you see:
```
📡 API Response: 200 OK
✅ API Success: {data: null}
```
→ The API returned success but no data (validation issue)

### **Scenario D: API Timeout**
If you see:
```
🔥 API Fetch Error: The request timed out after 30 seconds
```
→ The external API is slow or down

### **Scenario E: Network Error**
If you see:
```
🔥 API Fetch Error: Failed to fetch
```
→ CORS issue or network blocking

---

## 🛠️ **API Configuration**

### **External API Details**
- **Base URL**: `https://nehtw.com/api`
- **API Key**: `A8K9bV5s2OX12E8cmS4I96mtmSNzv7` (Hardcoded in `src/services/api.ts`)
- **Endpoint**: `/stockinfo/{site}/{id}`

### **Request Format**
```
GET https://nehtw.com/api/stockinfo/dreamstime/377059337
Headers:
  X-Api-Key: A8K9bV5s2OX12E8cmS4I96mtmSNzv7
```

### **Expected Response**
```json
{
  "data": {
    "id": "377059337",
    "site": "dreamstime",
    "preview": "https://...",
    "cost": 0.65,
    "title": "Plant root system...",
    "name": "image377059337.jpg",
    "author": "...",
    "ext": "jpg",
    "size": "..."
  }
}
```

---

## 🎯 **Possible Solutions**

### **If API Doesn't Support This File**
The external API (`nehtw.com`) might:
- Not have access to this specific Dreamstime file
- Have rate limits or usage restrictions
- Be outdated and not support newer Dreamstime URLs

**Solutions:**
1. Try a different Dreamstime URL
2. Contact the API provider (`nehtw.com`)
3. Use a different stock download API
4. Implement direct scraping (not recommended)

### **If Regex Pattern is Wrong** (Unlikely)
We tested and confirmed the regex works:
```javascript
/dreamstime\.com\/.*image([0-9]+)/i
// Matches: dreamstime.com/...image377059337
// Captures: 377059337
```

---

## 📝 **Summary**

✅ **Frontend**: Working perfectly  
✅ **URL Parsing**: Confirmed working (tested locally)  
❓ **External API**: Unknown (needs testing with logs)  

**The issue is likely**:
- The external API (`nehtw.com`) doesn't have this specific Dreamstime file
- OR the API has restrictions/rate limits

**Next Step**: Test with console open and send me the logs! 🚀

