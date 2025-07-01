# Cloudflare Pages Build Configuration

## Build Settings

When configuring Cloudflare Pages for the frontendv2 deployment, use these settings:

### Framework preset

- **Framework preset**: None

### Build configuration

- **Build command**: `ulimit -n 4096 && npm install && npm run build:frontend`
- **Build output directory**: `frontendv2/dist`
- **Root directory**: `/` (leave empty for repository root)

### Environment variables

```
NODE_VERSION=22
```

## Alternative Build Commands

If the above doesn't work, try these alternatives:

### Option 1: Use the build script (recommended for file limit issues)

```bash
./frontendv2/build.sh
```

### Option 2: Install and build with increased memory

```bash
npm install && cd frontendv2 && npm run build:cf
```

### Option 3: Install and build in one command

```bash
npm install && cd frontendv2 && npm run build
```

### Option 4: Explicit workspace build

```bash
npm install && npm run build -w @mirubato/frontendv2
```

## Troubleshooting

### Issue: "Failed to resolve import 'axios'"

This occurs when Cloudflare's build environment doesn't properly resolve npm workspace dependencies.

**Solution**: Ensure the build command includes `npm install` at the root level before building:

```bash
npm install && npm run build:frontend
```

### Issue: "Cannot find module"

This can happen if Cloudflare tries to build from the wrong directory.

**Solution**: Ensure the root directory is set to `/` (repository root) and the build output directory is `frontendv2/dist`.

### Issue: "EMFILE: too many open files"

This occurs when the build process tries to open too many files simultaneously, common with icon libraries like lucide-react.

**Solution**: Use the build script which increases the file descriptor limit:

```bash
./frontendv2/build.sh
```

Or prefix your build command with `ulimit -n 4096`:

```bash
ulimit -n 4096 && npm install && npm run build:frontend
```

## Current Working Configuration

As of the latest successful deployment:

- **Build command**: `npm install && npm run build:frontend`
- **Build output directory**: `frontendv2/dist`
- **Root directory**: `/`
- **Node version**: 22
