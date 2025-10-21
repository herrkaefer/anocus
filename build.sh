#!/bin/bash

# Download and install Hugo 0.152.0 if not present
if ! command -v hugo &> /dev/null || [[ "$(hugo version | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+')" != "v0.152.0" ]]; then
    echo "Installing Hugo 0.152.0..."
    wget -O hugo.tar.gz https://github.com/gohugoio/hugo/releases/download/v0.152.0/hugo_extended_0.152.0_linux-amd64.tar.gz
    tar -xzf hugo.tar.gz
    chmod +x hugo
    export PATH=$PWD:$PATH
fi

# Build the site
hugo -b $CF_PAGES_URL --buildDrafts --minify
