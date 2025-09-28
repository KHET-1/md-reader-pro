# 🚀 GitHub Pages Setup Guide

## Quick Setup (5 minutes)

### 1. Enable GitHub Pages
1. Go to your repository: `https://github.com/khet-1/md-reader-pro`
2. Click **Settings** tab
3. Scroll to **Pages** section (left sidebar)
4. Under **Source**, select **GitHub Actions**
5. Click **Save**

### 2. Push to Main Branch
```bash
git add .
git commit -m "feat: ready for GitHub Pages deployment"
git push origin main
```

### 3. Monitor Deployment
- Go to **Actions** tab in your repository
- Watch the "🚀 Deploy to GitHub Pages" workflow
- Wait for green checkmark ✅

### 4. Access Your App
Once deployed, your app will be available at:
**https://khet-1.github.io/md-reader-pro**

## What the Workflow Does

### Quality Gates (Must Pass)
- ✅ **ESLint** - Code quality checks
- ✅ **Tests** - 154 tests must pass
- ✅ **Coverage** - 80%+ coverage required
- ✅ **Performance** - Benchmarks must pass
- ✅ **Build** - Production build must succeed

### Deployment Process
1. **Quality Gates** - All tests and checks pass
2. **Build** - Creates optimized production bundle
3. **Prepare** - Adds deployment metadata
4. **Deploy** - Uploads to GitHub Pages

## Troubleshooting

### Common Issues

#### ❌ "No workflow runs found"
- **Solution**: Push a commit to `main` branch
- The workflow only runs on `main` branch pushes

#### ❌ "Environment not found"
- **Solution**: Repository Settings → Pages → Source = "GitHub Actions"
- This creates the required `github-pages` environment

#### ❌ "Quality gates failed"
- **Solution**: Check the Actions tab for specific failures
- Common fixes:
  - Run `npm run validate` locally
  - Fix linting errors: `npm run lint`
  - Fix tests: `npm test`

#### ❌ "Build failed"
- **Solution**: Check for missing dependencies or build errors
- Run locally: `npm run build`

### Manual Deployment Test
```bash
# Test everything locally first
npm run validate

# Build for production
npm run build

# Prepare deployment assets
npm run deploy:prepare

# Check dist/ folder contains:
# - index.html
# - bundle.[hash].js
# - status.html
# - deployment-manifest.json
```

## Status Pages

After deployment, these pages will be available:

- **Main App**: https://khet-1.github.io/md-reader-pro/
- **Status Page**: https://khet-1.github.io/md-reader-pro/status.html
- **Manifest**: https://khet-1.github.io/md-reader-pro/deployment-manifest.json

## Performance

Your deployed app includes:
- **Bundle Size**: ~45KB (optimized)
- **Load Time**: <2 seconds
- **Tests**: 154/154 passing
- **Coverage**: 80%+ branch coverage
- **Performance**: All benchmarks green

## Next Steps

1. **Enable Pages**: Repository Settings → Pages → GitHub Actions
2. **Push Code**: `git push origin main`
3. **Monitor**: Actions tab for deployment status
4. **Access**: https://khet-1.github.io/md-reader-pro/

**That's it!** Your professional markdown editor will be live on GitHub Pages. 🎉

