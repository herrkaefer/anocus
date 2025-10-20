#!/bin/bash

# Build script for Cloudflare Pages deployment
# This script is optimized for Cloudflare Pages build environment

set -e

echo "Starting Hugo build process..."

# Install Hugo if not present (for CI/CD environments)
if ! command -v hugo &> /dev/null; then
    echo "Hugo not found, installing..."
    # For Cloudflare Pages, Hugo is usually pre-installed
    # But we can specify version if needed
    export HUGO_VERSION=0.151.2
fi

# Build the site
echo "Building Hugo site..."
hugo --buildDrafts --minify

echo "Build completed successfully!"
echo "Output directory: public/"

# List the contents of public directory for verification
echo "Contents of public directory:"
ls -la public/
