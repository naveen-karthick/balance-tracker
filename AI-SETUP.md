# AI Summary Feature Setup

## Overview

Simple AI-powered financial summary using Vercel AI SDK with Vercel's AI Gateway.

## Quick Setup

### 1. Get Vercel AI Gateway Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project
3. Go to **Settings** → **AI**
4. Enable AI Gateway
5. Copy your gateway token

### 2. Add to Environment Variables

#### Local Development
Add to `.env`:
```bash
AI_GATEWAY_TOKEN="your-vercel-gateway-token-here"
```

#### Vercel Production
1. Go to Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `AI_GATEWAY_TOKEN`
   - **Value:** `your-vercel-gateway-token-here`
   - **Apply to:** Production, Preview

### 3. Test the Feature

1. Run `npm run dev`
2. Login to your app
3. Click the **sparkle icon** (✨) in header
4. Wait 2-5 seconds
5. View your AI-generated financial summary!

## What It Does

The AI analyzes your:
- 💰 Total portfolio value
- 📊 Asset allocation
- 💧 Liquidity analysis  
- 💸 Money lent patterns
- 🤝 Joint accounts
- 📈 Financial health
- 💡 Actionable recommendations

## Cost

Using GPT-4o-mini via Vercel AI Gateway:
- **Pay only for what you use**
- **Vercel handles billing**
- **Very affordable for personal use!** 🎉

## How It Works

1. Fetches your portfolio data from database
2. Sends to Vercel AI Gateway
3. Generates markdown-formatted insights
4. Displays in beautiful modal

## Architecture

```
Frontend (AI Button) 
  → API Route (/api/ai/summary)
  → Vercel AI SDK
  → Vercel AI Gateway
  → GPT-4o-mini
  → Formatted Summary
  → Modal Display
```

## Features

✅ Simple setup - just one environment variable  
✅ Beautiful markdown rendering  
✅ Mobile-friendly modal  
✅ Loading spinner  
✅ Error handling  
✅ Secure (requires authentication)  
✅ Cost-effective  

## Benefits of Vercel AI Gateway

✅ **No API Keys to manage** - Vercel handles it  
✅ **Automatic billing** - Pay through Vercel  
✅ **Better monitoring** - View usage in dashboard  
✅ **Built-in caching** - Reduce costs  
✅ **Simple setup** - Just one token needed

## Troubleshooting

### "Failed to generate summary"
- Check `AI_GATEWAY_TOKEN` is set correctly
- Verify AI Gateway is enabled in Vercel
- Check terminal for error logs
- Ensure you're on a plan that includes AI features

### Slow response
- Normal for first request (cold start)
- Subsequent requests are faster
- Check your internet connection

### Cost concerns
- Monitor usage at [Vercel Dashboard](https://vercel.com/dashboard)
- Check your AI usage in billing section
- Set spending limits in Vercel settings

---

🎉 **That's it! Your AI financial advisor is ready!**
