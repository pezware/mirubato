# Scorebook Feature - Quick Start Guide

## 🚀 Quick Testing Steps

### 1. Start Services

Open two terminals:

**Terminal 1 - Scores Service:**

```bash
cd scores
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontendv2
npm run dev
```

### 2. Upload Test PDFs (First time only)

```bash
cd scores
npm run upload:test-pdfs
```

Note: If you see an R2 error, that's OK - the PDFs will be served from a fallback location.

### 3. Test the Scorebook

Open your browser and visit:

- **Score Browser**: http://localhost:3000/scorebook
- **Test Score 1**: http://localhost:3000/scorebook/test_aire_sureno
- **Test Score 2**: http://localhost:3000/scorebook/test_romance_anonimo

### 4. What to Expect

**Without PDFs uploaded:**

- You'll see score metadata (title, composer, etc.)
- PDF viewer will show an error message
- All UI controls will still work

**With PDFs uploaded:**

- Full PDF display
- Page navigation for multi-page scores
- All features functional

## 🎯 Key Features to Test

1. **Score Browser** - Grid view of available scores
2. **PDF Viewer** - Display and navigation
3. **Floating Controls** - Metronome, practice tracking
4. **Management Panel** - Search, collections, upload

## 🐛 Troubleshooting

**CORS Issues?**

- Make sure both services are running
- Check that frontend is on port 3000

**PDFs Not Loading?**

- Check the browser console for errors
- Try the direct API endpoint: http://localhost:8787/api/test-data/score_01.pdf

**Database Issues?**

- Run: `cd scores && npm run seed:local`

## 📝 Notes

- This is a read-only demo for unauthenticated users
- Practice tracking and uploads require authentication
- Metronome audio is not yet implemented (UI only)

Happy testing! 🎵
