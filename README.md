# herrkaefer.com - Hugo Site

This is the Hugo version of the herrkaefer.com website, migrated from Jekyll.

## Local Development

### Prerequisites
- Hugo (installed via Homebrew: `brew install hugo`)
- Git

### Running Locally

1. Clone the repository:
```bash
git clone <your-repo-url>
cd herrkaefer-hugo
```

2. Start the development server:
```bash
hugo server --buildDrafts --port 1313
```

3. Open your browser to `http://localhost:1313`

### Building for Production

```bash
hugo --buildDrafts
```

The built site will be in the `public/` directory.

## Deployment to Cloudflare Pages

### Method 1: Direct Git Integration

1. **Push your Hugo site to a Git repository** (GitHub, GitLab, or Bitbucket)

2. **Connect to Cloudflare Pages:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to Pages
   - Click "Create a project"
   - Connect your Git provider
   - Select your repository

3. **Configure Build Settings:**
   - **Framework preset:** Hugo
   - **Build command:** `hugo --buildDrafts`
   - **Build output directory:** `public`
   - **Root directory:** `/` (or leave empty if Hugo files are in root)

4. **Environment Variables (if needed):**
   - Add any environment variables your site needs
   - For example: `HUGO_VERSION=0.151.2`

5. **Deploy:**
   - Click "Save and Deploy"
   - Cloudflare will automatically build and deploy your site

### Method 2: Manual Upload

1. **Build the site locally:**
```bash
hugo --buildDrafts
```

2. **Upload the `public/` directory:**
   - Go to Cloudflare Pages
   - Click "Upload assets"
   - Drag and drop the contents of the `public/` directory

### Method 3: Using Wrangler CLI

1. **Install Wrangler:**
```bash
npm install -g wrangler
```

2. **Login to Cloudflare:**
```bash
wrangler login
```

3. **Deploy:**
```bash
# Build the site
hugo --buildDrafts

# Deploy to Cloudflare Pages
wrangler pages deploy public --project-name=herrkaefer-com
```

## Custom Domain Setup

1. **In Cloudflare Pages:**
   - Go to your project settings
   - Navigate to "Custom domains"
   - Add your domain (e.g., `herrkaefer.com`)

2. **DNS Configuration:**
   - Add a CNAME record pointing to your Cloudflare Pages URL
   - Or use Cloudflare's nameservers for automatic configuration

## Site Structure

```
herrkaefer-hugo/
├── content/
│   └── posts/           # Blog posts
├── static/              # Static assets (CSS, images, etc.)
├── themes/
│   └── herrkaefer-theme/ # Custom theme
├── hugo.toml            # Site configuration
└── public/              # Built site (generated)
```

## Key Features

- **Responsive Design:** Maintains the original Jekyll layout and styling
- **Fast Build Times:** Hugo's speed advantage over Jekyll
- **SEO Optimized:** Proper meta tags and structured data
- **Social Integration:** GitHub, Twitter, Instagram, Weibo links
- **Analytics:** Google Analytics integration
- **RSS Feed:** Atom feed at `/atom.xml`

## Migration Notes

This site was migrated from Jekyll to Hugo while preserving:
- Original layout and styling
- All blog posts and content
- Social media integration
- Analytics configuration
- Static assets and images

The migration maintains the same URL structure and functionality as the original Jekyll site.
