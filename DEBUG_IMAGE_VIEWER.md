# Debugging Image-Based PDF Viewer in Staging

## 1. Check Browser Console

Open the browser's Developer Tools (F12) and check:

### Console Tab

- Look for any JavaScript errors
- Check for failed network requests
- Look for CORS errors or CSP violations

### Network Tab

1. Filter by "Img" or "Images"
2. Look for the request to: `https://scores-staging.mirubato.com/api/pdf/render/test_aire_sureno/page/1`
3. Check the response:
   - Status code (should be 200)
   - Response headers
   - Response body/preview

## 2. Test the Image URL Directly

Open a new tab and visit:

```
https://scores-staging.mirubato.com/api/pdf/render/test_aire_sureno/page/1
```

This should either:

- Show an image
- Return an error message
- Show a blank page (which would indicate the rendering is failing)

## 3. Check the Cloudflare Workers Logs

In the Cloudflare dashboard:

1. Go to Workers & Pages
2. Find the `scores-staging` worker
3. Click on "Logs" or "Real-time logs"
4. Look for errors related to:
   - Browser Rendering API
   - R2 access
   - PDF processing

## 4. Common Issues and Solutions

### A. Browser Rendering API Not Available

- The Browser Rendering API might not be enabled for the staging environment
- Check if it's available in your Cloudflare plan
- Verify it's enabled in the worker settings

### B. R2 Presigned URL Issues

- The presigned URL might be expiring too quickly
- There might be CORS issues with R2
- The PDF might not exist in R2

### C. PDF Processing Timeout

- The Browser Rendering API has a timeout limit
- Large PDFs might take too long to render
- Check if the worker is timing out

## 5. Quick Tests to Try

### Test 1: Check if the endpoint is responding

```bash
curl -I https://scores-staging.mirubato.com/api/pdf/render/test_aire_sureno/page/1
```

### Test 2: Check the raw response

```bash
curl https://scores-staging.mirubato.com/api/pdf/render/test_aire_sureno/page/1 -o test-image.webp
file test-image.webp
```

### Test 3: Check if it's a CORS issue

Try adding this to the image tag in the browser console:

```javascript
const img = new Image()
img.crossOrigin = 'anonymous'
img.onload = () => console.log('Image loaded successfully')
img.onerror = e => console.error('Image failed to load', e)
img.src =
  'https://scores-staging.mirubato.com/api/pdf/render/test_aire_sureno/page/1'
document.body.appendChild(img)
```

## 6. Temporary Workaround

If the image viewer continues to fail, you can force the PDF viewer by adding `?forcePdf=true` to the URL or by clicking "Switch to PDF viewer" if that button is visible.

## 7. Check Worker Environment Variables

Make sure these are set in the staging worker:

- `BROWSER` (Browser Rendering binding)
- `SCORES_BUCKET` (R2 bucket binding)
- `CACHE` (KV namespace for caching)
- `JWT_SECRET` (for authentication)

## 8. Debug Output

To add debug logging, you can temporarily modify the pdf-renderer.ts to log more information:

```typescript
console.log('PDF URL:', pdfUrl)
console.log('Page count:', pageCount)
console.log('Browser available:', !!c.env.BROWSER)
```

Then check the worker logs for this output.
