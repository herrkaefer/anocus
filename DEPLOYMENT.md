# Cloudflare Pages Deployment Guide

This guide explains how to deploy your Hugo site to Cloudflare Pages, replacing the current Jekyll deployment.

## Prerequisites

- A Cloudflare account
- Your Hugo site code in a Git repository (GitHub, GitLab, or Bitbucket)
- Access to your current domain DNS settings

## Step 1: Prepare Your Repository

1. **Push your Hugo site to a Git repository:**
```bash
cd /Users/herrk/dev-local/herrkaefer-hugo
git init
git add .
git commit -m "Initial Hugo site migration"
git remote add origin <your-repo-url>
git push -u origin main
```

## Step 2: Connect to Cloudflare Pages

1. **Access Cloudflare Pages:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to "Pages" in the left sidebar
   - Click "Create a project"

2. **Connect Git Repository:**
   - Choose your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Cloudflare to access your repositories
   - Select your `herrkaefer-hugo` repository

## Step 3: Configure Build Settings

1. **Project Setup:**
   - **Project name:** `herrkaefer-com` (or your preferred name)
   - **Production branch:** `main` (or your default branch)
   - **Root directory:** `/` (leave empty if Hugo files are in root)

2. **Build Configuration:**
   - **Framework preset:** `Hugo`
   - **Build command:** `hugo --buildDrafts --minify`
   - **Build output directory:** `public`
   - **Hugo version:** `0.151.2` (or latest)

3. **Environment Variables (Optional):**
   - Add any environment variables your site needs
   - For example: `HUGO_VERSION=0.151.2`

## Step 4: Deploy

1. **Initial Deployment:**
   - Click "Save and Deploy"
   - Cloudflare will automatically build and deploy your site
   - Wait for the build to complete (usually 1-2 minutes)

2. **Verify Deployment:**
   - Your site will be available at a Cloudflare Pages URL (e.g., `https://herrkaefer-com.pages.dev`)
   - Test the site to ensure everything works correctly

## Step 5: Configure Custom Domain

1. **Add Custom Domain:**
   - In your Cloudflare Pages project, go to "Custom domains"
   - Click "Set up a custom domain"
   - Enter your domain: `herrkaefer.com`

2. **DNS Configuration:**
   - **Option A: Use Cloudflare Nameservers (Recommended)**
     - Change your domain's nameservers to Cloudflare's
     - Cloudflare will automatically configure DNS

   - **Option B: Manual DNS Configuration**
     - Add a CNAME record: `@` → `herrkaefer-com.pages.dev`
     - Add a CNAME record: `www` → `herrkaefer-com.pages.dev`

3. **SSL/TLS:**
   - Cloudflare automatically provides SSL certificates
   - Ensure "Always Use HTTPS" is enabled in SSL/TLS settings

## Step 6: Update DNS (if not using Cloudflare nameservers)

If you're not using Cloudflare nameservers, update your DNS records:

1. **Remove old Jekyll site records:**
   - Delete any CNAME records pointing to the old Jekyll site
   - Remove any A records for the old hosting

2. **Add new records:**
   - Add CNAME record: `@` → `herrkaefer-com.pages.dev`
   - Add CNAME record: `www` → `herrkaefer-com.pages.dev`

## Step 7: Verify Migration

1. **Test the site:**
   - Visit `https://herrkaefer.com`
   - Check that all pages load correctly
   - Verify that all links work
   - Test the RSS feed at `/atom.xml`

2. **Performance check:**
   - Use tools like Google PageSpeed Insights
   - Verify that the site loads faster than the Jekyll version

## Step 8: Clean Up Old Deployment

1. **Remove old Jekyll site:**
   - Delete the old Jekyll repository (if no longer needed)
   - Cancel any old hosting services
   - Update any bookmarks or references

## Continuous Deployment

Once set up, Cloudflare Pages will automatically:
- Build and deploy your site when you push to the main branch
- Provide preview deployments for pull requests
- Handle SSL certificates automatically
- Provide global CDN distribution

## Troubleshooting

### Common Issues:

1. **Build Failures:**
   - Check the build logs in Cloudflare Pages dashboard
   - Ensure all dependencies are properly configured
   - Verify Hugo version compatibility

2. **Domain Issues:**
   - Wait for DNS propagation (up to 24 hours)
   - Check DNS records are correctly configured
   - Verify SSL certificate status

3. **Content Issues:**
   - Ensure all static assets are in the `static/` directory
   - Check that all posts are properly formatted
   - Verify theme templates are correct

### Getting Help:

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Hugo Documentation](https://gohugo.io/documentation/)
- [Cloudflare Community](https://community.cloudflare.com/)

## Benefits of Hugo over Jekyll

- **Speed:** Hugo builds significantly faster than Jekyll
- **No Dependencies:** Hugo is a single binary, no Ruby/Gem dependencies
- **Better Performance:** Faster build times mean faster deployments
- **Modern Features:** Better support for modern web development practices
- **Easier Deployment:** Simpler deployment process with fewer moving parts

Your site is now successfully migrated to Hugo and deployed on Cloudflare Pages!
