#!/bin/bash

echo "🚀 Starting ProdActivity Deployment..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin <your-github-repo-url>"
    echo "   git push -u origin main"
    exit 1
fi

# Check if changes need to be committed
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Committing changes..."
    git add .
    git commit -m "Prepare for deployment"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo "✅ Code pushed to GitHub!"
echo ""
echo "🎯 Next Steps:"
echo "1. Deploy Frontend to Vercel:"
echo "   - Go to https://vercel.com"
echo "   - Click 'New Project'"
echo "   - Import your GitHub repository"
echo "   - Set root directory to 'frontend'"
echo "   - Click 'Deploy'"
echo ""
echo "2. Deploy Backend to Railway:"
echo "   - Go to https://railway.app"
echo "   - Click 'New Project'"
echo "   - Choose 'Deploy from GitHub repo'"
echo "   - Select your repository"
echo "   - Set root directory to 'backend'"
echo ""
echo "3. Configure Environment Variables:"
echo "   - Add your .env variables to Railway"
echo "   - Set DEBUG=False for production"
echo ""
echo "4. Update Frontend Configuration:"
echo "   - Update package.json with your actual URLs"
echo "   - Redeploy frontend"
echo ""
echo "📖 See DEPLOYMENT_GUIDE.md for detailed instructions!"
