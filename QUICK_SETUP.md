# 🚀 Quick Setup: Fix Your Supabase Connection

## The Problem
Your Supabase project `axjgrfrfhqyqjmksxxld` no longer exists, causing authentication errors.

## The Solution (5 Steps)

### 1️⃣ Create New Supabase Project (2 minutes)
- Go to: https://supabase.com
- Click **"New Project"**
- Name: `creative-studio` 
- Region: Choose closest to you
- Click **"Create new project"**
- Wait for it to finish (~2 min)

### 2️⃣ Get Your Credentials (30 seconds)
In your Supabase dashboard:
1. Click ⚙️ **Settings** (bottom left)
2. Click **"API"**
3. Copy these two values:
   - **Project URL**
   - **anon public** key

### 3️⃣ Update .env.local File

Run this command:
```bash
./update-supabase-credentials.sh
```

Or manually edit `.env.local` and paste your new credentials:
```bash
VITE_SUPABASE_URL=https://your-new-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key-here
```

### 4️⃣ Set Up Database (1 minute)
1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the contents of `database-setup.sql` file
4. Paste and click **"RUN"**
5. Wait for success message

### 5️⃣ Restart Your Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

## ✅ Done!

Now go to http://localhost:3000 and:
1. Click **"Sign Up"**
2. Create an account
3. You should see the dashboard!

---

**Need help?** Check `SETUP_NEW_SUPABASE.md` for detailed instructions.
