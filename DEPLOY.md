# Render Deployment Checklist

## Before You Start
- [ ] Have GitHub account ready
- [ ] Have Render account ready (sign up at render.com)
- [ ] Get Helius API key from helius.dev

## Step 1: Push to GitHub
```bash
cd backend
git init
git add .
git commit -m "Prepare backend for deployment"
```

Create repo on GitHub, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/wallet-backend.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy on Render
1. Go to render.com → New + → Web Service
2. Connect your GitHub repository
3. Configure:
   - Name: `wallet-backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance: Free (for testing)

## Step 3: Add Environment Variables
In Render dashboard, add:
- `HELIUS_API_KEY` = your-api-key
- `PORT` = 3001
- `SOLANA_NETWORK` = devnet
- `NODE_ENV` = production

## Step 4: Deploy
- Click "Create Web Service"
- Wait 2-5 minutes for deployment
- Copy your backend URL: `https://wallet-backend-xxxx.onrender.com`

## Step 5: Test Backend
```bash
curl https://your-backend-url.onrender.com/health
curl https://your-backend-url.onrender.com/api/sol-price
```

## Step 6: Update Frontend
Edit `frontend/src/config/config.js`:
```javascript
const API_BASE_URL = 'https://your-backend-url.onrender.com';
```

Then rebuild:
```bash
cd frontend
npm run build
```

## Step 7: Reload Extension
- Go to chrome://extensions/
- Click "Reload" on your wallet
- Test everything!

## Done! 🎉
Your wallet is now using a secure production backend!
