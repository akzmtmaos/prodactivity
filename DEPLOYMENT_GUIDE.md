# 🚀 Deployment Guide for ProdActivity

This guide will help you deploy the ProdActivity project so your team can access it online for testing.

## 📋 Prerequisites

- GitHub account
- Vercel account (free) - [Sign up here](https://vercel.com)
- Railway account (free) - [Sign up here](https://railway.app)

## 🎯 Quick Deployment Steps

### 1. Frontend Deployment (Vercel)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set the root directory to `frontend`
   - Click "Deploy"

3. **Update API URL**:
   - After deployment, copy your Vercel URL
   - Update `frontend/package.json` with your actual Vercel URL
   - Update the proxy to point to your backend URL

### 2. Backend Deployment (Railway)

1. **Deploy to Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your repository
   - Set the root directory to `backend`

2. **Configure Environment Variables**:
   - In Railway dashboard, go to "Variables"
   - Add your environment variables from `.env` file
   - Set `DEBUG=False` for production
   - Set `ALLOWED_HOSTS` to include your Railway domain

3. **Get Backend URL**:
   - Copy the Railway deployment URL
   - Update frontend proxy configuration

### 3. Update Frontend Configuration

After getting both URLs:

1. **Update `frontend/package.json`**:
   ```json
   {
     "homepage": "https://your-app-name.vercel.app",
     "proxy": "https://your-backend-url.railway.app"
   }
   ```

2. **Redeploy frontend**:
   - Push changes to GitHub
   - Vercel will automatically redeploy

## 🔧 Environment Variables Setup

### Backend (.env file for Railway)
```env
DEBUG=False
SECRET_KEY=your-secret-key
DATABASE_URL=your-database-url
ALLOWED_HOSTS=your-railway-domain.railway.app
CORS_ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
```

### Frontend (Vercel Environment Variables)
- `REACT_APP_API_URL=https://your-backend-url.railway.app`

## 🌐 Access Your Deployed App

- **Frontend**: `https://your-app-name.vercel.app`
- **Backend API**: `https://your-backend-url.railway.app`

## 📱 Share with Your Team

1. **Frontend URL**: Share the Vercel URL with your team
2. **Backend API**: Use for testing API endpoints
3. **GitHub Repository**: Team can clone and contribute

## 🔄 Continuous Deployment

Both Vercel and Railway will automatically redeploy when you push changes to GitHub!

## 🛠️ Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure `CORS_ALLOWED_ORIGINS` includes your frontend URL
2. **Database Issues**: Check if Railway database is properly configured
3. **Build Failures**: Check the deployment logs in Vercel/Railway dashboard

### Useful Commands:

```bash
# Check deployment status
vercel ls
railway status

# View logs
vercel logs
railway logs
```

## 📞 Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **GitHub Issues**: Create issues in your repository

---

**Happy Deploying! 🎉**
