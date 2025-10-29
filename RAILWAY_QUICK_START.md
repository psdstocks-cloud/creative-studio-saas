# Railway BFF - Quick Start

## ✅ Code is Ready!

Your BFF server is **ready to deploy** to Railway. Follow these steps:

---

## 🚀 5-Minute Deployment

### 1. Sign Up for Railway
- Go to: https://railway.app
- Click "Login with GitHub"
- Get $5 free credits

### 2. Deploy from GitHub
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose: `psdstocks-cloud/creative-studio-saas`
- Wait 2-3 minutes

### 3. Add Environment Variables
Click your service → Variables tab → Add these:

```
NODE_ENV=production
SUPABASE_URL=(copy from Cloudflare VITE_SUPABASE_URL)
SUPABASE_SERVICE_ROLE_KEY=(get from Supabase Dashboard → API → service_role)
STOCK_API_KEY=(copy from Cloudflare)
STOCK_API_BASE_URL=https://nehtw.com/api
ALLOWED_ORIGINS=https://creative-studio-saas.pages.dev,http://localhost:5173
SESSION_COOKIE_NAME=css_bff_session
```

### 4. Generate Domain
- Settings → Networking → "Generate Domain"
- Copy URL (e.g., `your-service.up.railway.app`)

### 5. Connect to Frontend
- Go to Cloudflare: Workers & Pages → creative-studio-saas → Settings
- Add variable:
  - Name: `VITE_API_BASE_URL`
  - Value: `https://your-service.up.railway.app`
- Redeploy frontend (Deployments → Retry)

### 6. Test
- Visit: `https://your-service.up.railway.app/health`
- Should show: `{"status":"ok"}`
- Go to: `https://creative-studio-saas.pages.dev/admin`
- Should load without timeout!

---

## 📖 Full Guide

For detailed instructions, see: **`RAILWAY_DEPLOYMENT_GUIDE.md`**

---

## 💰 Cost

- **Trial**: $5 free credits
- **After trial**: ~$2-5/month
- **Always-on**: No cold starts

---

## 🆘 Issues?

See troubleshooting in `RAILWAY_DEPLOYMENT_GUIDE.md`

---

**Ready?** Start at: https://railway.app

