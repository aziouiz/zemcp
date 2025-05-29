#!/bin/bash

# Release script for zemcp packages
# Usage: ./release.sh [patch|minor|major]

set -e

# Get the version type (patch, minor, major)
VERSION_TYPE=${1:-patch}

echo "🚀 Starting release process for version: $VERSION_TYPE"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: You're not on the main branch. Current branch: $CURRENT_BRANCH"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Release cancelled"
        exit 1
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: You have uncommitted changes. Please commit or stash them first."
    git status --short
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies and build
echo "📦 Installing dependencies..."
npm install

echo "🔨 Building projects..."
npm run build

# Update versions
echo "📝 Updating package versions..."
npm run version:$VERSION_TYPE

# Get the new version from one of the packages
NEW_VERSION=$(node -p "require('./zemcp-mssql/package.json').version")

echo "📋 New version: $NEW_VERSION"

# Commit version changes
echo "💾 Committing version changes..."
git add .
git commit -m "chore: bump version to $NEW_VERSION"

# Create and push tag
echo "🏷️  Creating and pushing tag..."
git tag "v$NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

echo "✅ Release $NEW_VERSION completed!"
echo "🎉 The GitHub Action will now automatically publish to NPM"
