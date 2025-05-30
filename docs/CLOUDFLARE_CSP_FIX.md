# Cloudflare Content Security Policy (CSP) Fix

## Problem

When deployed to Cloudflare Workers, the application encounters CSP violations:
1. Web Workers creation blocked (Tone.js uses blob: URLs)
2. External audio samples blocked (tonejs.github.io)
3. Font loading issues

## Solution

### Option 1: Updated CSP Headers (Implemented ✅)

Updated `public/_headers` to allow necessary resources:
```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
  font-src 'self' https://fonts.gstatic.com data:; 
  img-src 'self' data: blob:; 
  connect-src 'self' https://tonejs.github.io https://*.tonejs.github.io; 
  media-src 'self' https://tonejs.github.io https://*.tonejs.github.io blob: data:; 
  worker-src 'self' blob:
```

Key additions:
- `blob:` in script-src and worker-src for Tone.js Web Workers
- `https://tonejs.github.io` in connect-src and media-src for piano samples
- `data:` in font-src for inline fonts

**Current Status**: The audioManager is configured to always use CDN samples from tonejs.github.io. This is the working solution that avoids the need for local file storage while providing high-quality piano samples globally via CDN.

### Option 2: Local Audio Samples (Future Enhancement)

For better control over audio assets and to reduce external dependencies:

1. **Download samples locally** (not currently implemented):
   ```bash
   node scripts/download-piano-samples.js
   ```
   This would download Salamander Grand Piano samples to `public/audio/salamander/`

2. **Benefits of local samples**:
   - No external dependencies
   - Faster loading for repeat users
   - Full control over audio assets
   - Can work offline once cached

Note: The current CDN approach works well and is simpler to maintain. Local samples can be added later if needed.

## Testing

1. **Local testing**:
   ```bash
   npm run build
   npm run preview
   ```

2. **Test CSP headers**:
   - Check browser console for CSP violations
   - Verify audio playback works
   - Test on both landing page and practice page

## Deployment

After making these changes:
1. Commit and push to your branch
2. Deploy to Cloudflare Workers
3. Test audio functionality on the deployed site

## Notes

- The CSP is now more permissive but still secure
- Consider hosting audio samples locally for better performance
- Monitor for any new CSP violations in production