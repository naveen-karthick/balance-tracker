# Vercel Deployment Guide

## Prerequisites
- ✅ Code pushed to GitHub
- ✅ Neon PostgreSQL database created
- ✅ Database migrations run locally

## Step 1: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..." → "Project"**
3. Import your GitHub repository: `naveen-karthick/balance-tracker`
4. Configure the project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

## Step 2: Add Environment Variables

Click on **"Environment Variables"** and add these **THREE** required variables:

### 1. DATABASE_URL
```
Value: Your Neon PostgreSQL connection string (pooled)
```
**Where to get it:**
- Go to your Neon.tech dashboard
- Navigate to your database
- Copy the **"Pooled connection"** string
- Should look like: `postgresql://neondb_owner:npg_xxxxx@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require`

**Apply to:**
- ☑️ Production
- ☑️ Preview
- ☐ Development (optional)

---

### 2. NEXTAUTH_SECRET
```
Value: A random 32+ character string
```
**Generate one:**
- Run in terminal: `openssl rand -base64 32`
- Or visit: https://generate-secret.vercel.app/32
- Example: `your-randomly-generated-secret-here-32chars+`

**Apply to:**
- ☑️ Production
- ☑️ Preview
- ☐ Development (optional)

---

### 3. NEXTAUTH_URL
```
Value: https://your-app-name.vercel.app
```
**First deployment:**
- Set to: `https://balance-tracker.vercel.app` (or whatever Vercel assigns)
- You can update this after first deployment with actual URL

**Apply to:**
- ☑️ Production
- ☑️ Preview (use preview URL pattern)
- ☐ Development (optional)

## Step 3: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (~2-3 minutes)
3. Once deployed, click "Visit" to see your app
4. **IMPORTANT:** Copy the actual deployment URL

## Step 4: Update NEXTAUTH_URL (Post-Deployment)

1. Go to **Settings → Environment Variables**
2. Find `NEXTAUTH_URL`
3. Click **"Edit"**
4. Update with your actual Vercel URL (e.g., `https://balance-tracker-xxxxx.vercel.app`)
5. **Redeploy** the project for changes to take effect

## Step 5: Run Database Migrations on Production

Since your database is already set up with migrations, Vercel will use your existing database. No additional migration steps needed!

## Troubleshooting

### Build Fails with Prisma Error
- **Solution:** Ensure `postinstall` script is in `package.json`
- Should have: `"postinstall": "prisma generate"`

### Can't Connect to Database
- Check `DATABASE_URL` is correct in Vercel env vars
- Ensure you're using the **pooled connection** string from Neon
- Verify the connection string includes `?sslmode=require`

### Authentication Not Working
- Verify `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your deployment URL
- Redeploy after updating environment variables

### Preview Deployments
For pull requests and branches:
- Set `NEXTAUTH_URL` for Preview to: `https://balance-tracker-git-[branch-name]-[your-username].vercel.app`
- Or use a wildcard pattern

## Custom Domain (Optional)

To add a custom domain:
1. Go to **Settings → Domains**
2. Add your domain
3. Update DNS records as instructed by Vercel
4. Update `NEXTAUTH_URL` to use your custom domain

## Post-Deployment Checklist

- [ ] App loads successfully
- [ ] Can register a new user
- [ ] Can login with created user
- [ ] Can add/edit/delete categories
- [ ] All data persists after refresh
- [ ] PWA can be installed on mobile
- [ ] Logout works correctly

## Useful Commands

**Trigger a redeploy:**
```bash
# Via CLI (if you have Vercel CLI installed)
vercel --prod

# Or just push to GitHub - Vercel auto-deploys
git push origin main
```

**View logs:**
- Go to your project dashboard on Vercel
- Click on a deployment
- Navigate to "Functions" or "Runtime Logs"

## Environment Variables Summary

| Variable | Description | Where to get |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL connection | Neon.tech dashboard (pooled) |
| `NEXTAUTH_SECRET` | Auth secret key | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production URL | Your Vercel deployment URL |
| `AI_GATEWAY_TOKEN` | Vercel AI Gateway token (for AI summaries) | Vercel Dashboard → Settings → AI |

**Note:** The `AI_GATEWAY_TOKEN` is optional. Add it only if you want to use the AI Summary feature. See `AI-SETUP.md` for details.

---

🎉 **Your app is now live!**

Share your deployment URL and start tracking your balance! 🚀
