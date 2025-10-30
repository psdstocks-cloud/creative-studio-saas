# ⚠️ IMPORTANT: Have You Run the SQL Script?

Based on your screenshot showing "0 sources", it looks like the database migration **hasn't been run yet**.

## 🔍 How to Check

### Step 1: Open Supabase
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar

### Step 2: Run This Check Query

Paste this into SQL Editor and click Run:

```sql
SELECT COUNT(*) FROM stock_sources;
```

**What it should show:**
- ✅ **If you see `39`** → Database is ready! You just need to restart your backend server
- ❌ **If you see an error** like "relation does not exist" → You need to run the migration

---

## ✅ If the Table Doesn't Exist (You See an Error)

### Follow These Exact Steps:

1. **In Supabase SQL Editor**, click **"New Query"**

2. **Open the file:** `quick-setup-stock-sources.sql` from your project

3. **Copy ALL the contents** (Cmd+A then Cmd+C)

4. **Paste into Supabase** (Cmd+V)

5. **Click the green "Run" button** (or press Cmd+Enter)

6. **You should see:**
   ```
   Stock Sources Setup Complete!
   total_sources: 39
   active_sources: 38
   ```

7. **Then restart your backend server**

8. **Refresh the admin page**

---

## 🔄 If the Table EXISTS (You See 39 Sources)

But you're still seeing "0 sources" on the page, then:

### The Backend Server Needs a Restart

**Check 1: Is your server running?**
```bash
# In your terminal, check if node is running
ps aux | grep node
```

**If server is running:**
1. Stop it (Ctrl+C in the terminal where it's running)
2. Start it again: `npm run dev`

**If server is deployed (Railway/Vercel):**
1. Trigger a redeploy or restart

**Then refresh your browser** on the admin page

---

## 🐛 Still Not Working?

### Run This Diagnostic Query in Supabase:

```sql
-- Check 1: Does table exist?
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'stock_sources'
) as table_exists;

-- Check 2: How many sources?
SELECT COUNT(*) as count FROM stock_sources;

-- Check 3: Show first 3 sources
SELECT key, name, cost, active 
FROM stock_sources 
LIMIT 3;

-- Check 4: Check policies (RLS)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'stock_sources';
```

**Then share the results** so I can help debug further!

---

## 📝 What Should Happen

### Expected Behavior:
1. ✅ SQL script runs in Supabase → Creates table and inserts 39 sources
2. ✅ Backend server starts → Connects to database
3. ✅ Admin page loads → Shows 39 sources

### Current State:
- ❌ Page shows 0 sources
- ❌ This means step 1 OR step 2 is missing

---

## 🎯 Quick Action Items

**Right now, please:**

1. Open Supabase SQL Editor
2. Run: `SELECT COUNT(*) FROM stock_sources;`
3. Tell me what number you see

If you see:
- **39** → Restart your backend server
- **Error** → Run the migration script
- **0** → Run the migration script (but this is odd, should be 39)

---

## 💬 Tell Me

After checking, please reply with:
- What number you saw from `SELECT COUNT(*) FROM stock_sources;`
- Whether your backend server is running locally or deployed
- Any error messages you see in the browser console (F12 → Console tab)

Then I can give you the exact next step!

