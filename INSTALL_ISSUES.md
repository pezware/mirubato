# Installation Issues and Workarounds

## Current Issue

When running `npm install` from the root, you may encounter an esbuild error:
```
Error: spawnSync /node_modules/vite/node_modules/esbuild/bin/esbuild Unknown system error -88
```

This is likely due to:
1. Node.js v23 compatibility issues with esbuild
2. npm workspaces having issues with binary dependencies

## Workaround

Until the workspace issues are resolved, install dependencies separately:

```bash
# Option 1: Use the install script
./install.sh

# Option 2: Manual installation
# Install backend
cd backend
npm install

# Install frontend (in a new terminal)
cd frontend  
npm install
```

## Alternative Solutions

1. **Use Node.js v20 LTS** (Recommended):
   ```bash
   nvm install 20
   nvm use 20
   npm install
   ```

2. **Force esbuild platform**:
   ```bash
   npm install --force
   ```

3. **Clear npm cache**:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

## Running the Project

After installation, you can still use the root scripts:

```bash
# From root directory
npm run dev          # Start frontend
npm run dev:backend  # Start backend (new terminal)
```

Or run directly from each folder:

```bash
# Frontend
cd frontend && npm run dev

# Backend  
cd backend && npm run dev
```