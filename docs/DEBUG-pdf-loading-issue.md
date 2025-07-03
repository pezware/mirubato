# PDF Loading Infinite Loop Issue

## Problem Description

When viewing a PDF score at `https://staging.mirubato.com/scorebook/test_romance_anonimo`, the PDF viewer enters an infinite loading loop. The network tab shows repeated successful requests (200 status) to `score_02.pdf`, but the PDF never displays.

## Browser Network Tab Evidence

- Multiple requests to `/api/test-data/score_02.pdf` with 200 status
- PDF worker files loading successfully (`pdf.worker.mjs`)
- Continuous loop of requests without displaying the PDF
- No console errors visible

## Current Configuration

- Using `react-pdf` v10.0.1
- PDF.js worker configured with jsDelivr CDN: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`
- CSP headers include jsDelivr in both script-src and worker-src

## Component Structure

1. `ScoreViewer` → `AdaptivePdfViewer` → `PdfViewer` (react-pdf)
2. ScoreViewer forces PDF viewer with `forcePdfViewer={true}`
3. AdaptivePdfViewer has retry logic with max 3 retries

## Test Results

- Direct curl to PDF URL works: `curl -s "https://scores-staging.mirubato.com/api/test-data/score_02.pdf"` returns valid PDF
- PDF starts with `%PDF-1.3` magic bytes
- File is accessible and valid

## Key Code Files

### 1. PdfViewer.tsx (main PDF viewer component)

```typescript
import { useState, useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`

export default function PdfViewer({
  url,
  currentPage = 1,
  onLoad,
  onError,
  onPageChange,
  className = '',
  scale = 1.0,
  enableTextLayer = false,
  enableAnnotationLayer = false,
  mobileOptimized = true,
  enableTouchGestures = true,
}: PdfViewerProps) {
  // ... state management ...

  const handleDocumentLoadSuccess = useCallback(
    async (pdf: { numPages: number; getMetadata: () => Promise<any> }) => {
      setNumPages(pdf.numPages)
      setLoading(false)
      setError(null)

      const metadata = await pdf.getMetadata()
      const info: PdfInfo = {
        numPages: pdf.numPages,
        // ... extract metadata ...
      }

      onLoad?.(info)
    },
    [onLoad]
  )

  return (
    <div className={`pdf-viewer-container ${className}`}>
      <Document
        key={url} // Add key to prevent unnecessary reloads
        file={url}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        options={{
          httpHeaders: {
            Authorization: localStorage.getItem('auth-token')
              ? `Bearer ${localStorage.getItem('auth-token')}`
              : undefined,
          },
        }}
        loading={<div>Loading PDF...</div>}
        error={<div>Failed to load PDF</div>}
      >
        <Page
          pageNumber={pageNumber}
          width={pageWidth || undefined}
          renderTextLayer={enableTextLayer}
          renderAnnotationLayer={enableAnnotationLayer}
          className="mx-auto shadow-lg"
        />
      </Document>
    </div>
  )
}
```

### 2. AdaptivePdfViewer.tsx (wrapper with retry logic)

```typescript
export default function AdaptivePdfViewer({
  scoreId,
  currentPage = 1,
  onPageChange,
  onLoad,
  onError,
  className = '',
  forceImageViewer,
  forcePdfViewer,
}: AdaptivePdfViewerProps) {
  const [useImageViewer, setUseImageViewer] = useState(false)
  const [isImageBasedScore, setIsImageBasedScore] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [totalPages, setTotalPages] = useState<number | undefined>()
  const [errorCount, setErrorCount] = useState(0)
  const maxRetries = 3

  // Reset error count when scoreId changes
  useEffect(() => {
    setErrorCount(0)
  }, [scoreId])

  // Detect viewer mode
  useEffect(() => {
    const detectViewerMode = async () => {
      // Check if this is an image-based score
      try {
        const score = await scoreService.getScore(scoreId)
        if (score.source_type === 'image' || score.source_type === 'multi-image') {
          setIsImageBasedScore(true)
          return
        }
      } catch (error) {
        console.error('Failed to fetch score details:', error)
      }

      if (forcePdfViewer) {
        setUseImageViewer(false)
        setPdfUrl(scoreService.getScorePdfUrl(scoreId))
        return
      }

      // Default to PDF viewer
      setUseImageViewer(false)
      setPdfUrl(scoreService.getScorePdfUrl(scoreId))
    }

    detectViewerMode()
  }, [scoreId, forceImageViewer, forcePdfViewer])

  // Error handler with retry logic
  const handleError = (error: PdfError | { message: string; type: string }) => {
    console.error('Viewer error:', error)

    // Increment error count
    setErrorCount(prev => prev + 1)

    // If we've exceeded max retries, stop trying
    if (errorCount >= maxRetries) {
      console.error(`Max retries (${maxRetries}) exceeded, stopping`)
      onError?.(error)
      return
    }

    onError?.(error)
  }

  return (
    <div className={`adaptive-pdf-viewer ${className}`}>
      <PdfViewer
        url={pdfUrl}
        currentPage={currentPage}
        onLoad={onLoad}
        onError={handleError}
        onPageChange={onPageChange}
        className="w-full"
        scale={1.0}
        enableTextLayer={false}
        enableAnnotationLayer={false}
        mobileOptimized={true}
        enableTouchGestures={true}
      />
    </div>
  )
}
```

### 3. ScoreViewer.tsx (top-level component)

```typescript
export default function ScoreViewer({ score }: ScoreViewerProps) {
  const { currentPage, setCurrentPage, setTotalPages } = useScoreStore()

  const handlePdfLoad = (info: { numPages: number }) => {
    setTotalPages(info.numPages)
  }

  const handlePdfError = (error: PdfError | { message: string; type: string }) => {
    console.error('PDF load error:', error)
  }

  return (
    <div className="flex-1 relative bg-white">
      <AdaptivePdfViewer
        scoreId={score.id}
        currentPage={currentPage}
        onLoad={handlePdfLoad}
        onError={handlePdfError}
        onPageChange={handlePageChange}
        className="w-full"
        forcePdfViewer={true} // Force PDF viewer
      />
    </div>
  )
}
```

### 4. CSP Headers (public/\_headers)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://static.cloudflareinsights.com https://accounts.google.com https://apis.google.com https://unpkg.com https://cdn.jsdelivr.net; ... worker-src 'self' blob: https://unpkg.com https://cdn.jsdelivr.net
```

## Suspected Causes

1. Component re-rendering causing Document to reload
2. Error in PDF loading triggering retry logic
3. State update causing infinite re-render loop
4. Issue with react-pdf's Document component key prop
5. Worker configuration issue despite CSP being correct

## What Works

- Direct PDF access via curl
- PDF.js worker loads successfully
- No CORS errors
- CSP includes necessary domains

## What Doesn't Work

- PDF never displays despite successful network requests
- Infinite loop of loading the same PDF file

## request back and forth with gemini

````
⏺ Bash(cd /Users/arbeitandy/src/public/mirubato && gemini -p
      "@pdf-loading-issue.md @frontendv2/src/components/score/PdfViewer.tsx
      @frontendv2/src/components/score/AdaptivePdfViewer.tsx
      @frontendv2/src/components/score/ScoreViewer.tsx
      @frontendv2/public/_headers Analyze this infinite PDF loading loop issue.
      The PDF loads successfully (200 status) but keeps reloading infinitely.
      What's causing this loop and how can we fix it?")
  ⎿  Error: Error executing tool replace: Tool "replace" not found in registry.

     Data collection is disabled.
     Data collection is disabled.
     I will analyze the infinite PDF loading loop issue. First, I'll read the
     user-provided files to understand the problem, the involved components, and
     the server's header configurations. This will help me pinpoint the cause of
     the reloading loop.## Hypothesis
     The issue is likely a state management problem within the component
     hierarchy. The `url` prop passed to `PdfViewer` might be changing on every
     render, causing `react-pdf`'s `Document` component to re-trigger the PDF
     download. The `key={url}` prop on the `Document` component is intended to
     prevent this, but if the `url` string itself is being recreated on each
     render, it would cause a reload.

     Let's investigate how `pdfUrl` is generated and passed down. In
     `AdaptivePdfViewer`, `pdfUrl` is set via
     `setPdfUrl(scoreService.getScorePdfUrl(scoreId))`. If `getScorePdfUrl`
     returns a new string object on every call (even if the value is the same),
     this could be the root cause.

     ### Proposed Fix
     Memoize the `pdfUrl` so it doesn't trigger re-renders. Use `useMemo` in
     `AdaptivePdfViewer`.

     ```typescript
     // In AdaptivePdfViewer.tsx
     import { useMemo } from 'react'

     // ...

     const pdfUrl = useMemo(() => scoreService.getScorePdfUrl(scoreId), [scoreId])

     // ...

     <PdfViewer url={pdfUrl} ... />
     ```
     This ensures the `url` prop is stable across re-renders as long as `scoreId`
     doesn't change.This is a classic re-rendering issue. Based on the provided
     information, the infinite loop is caused by a state management problem within
      the component hierarchy, specifically with how the `pdfUrl` is being
     generated and passed to the `PdfViewer` component.

     Here's a breakdown of the cause and the solution:

     ### The Cause of the Infinite Loop

     1.  **`ScoreViewer` Renders `AdaptivePdfViewer`**: This component is the
     entry point.
     2.  **`AdaptivePdfViewer`'s `useEffect` Hook**: Inside `AdaptivePdfViewer`, a
      `useEffect` hook runs whenever `scoreId`, `forceImageViewer`, or
     `forcePdfViewer` changes.
     3.  **State Update**: Inside this `useEffect`,
     `setPdfUrl(scoreService.getScorePdfUrl(scoreId))` is called. This updates the
      `pdfUrl` state variable.
     4.  **Re-render**: The `setPdfUrl` call triggers a re-render of
     `AdaptivePdfViewer`.
     5.  **`PdfViewer` Receives New `url` Prop**: The `PdfViewer` component
     receives the `pdfUrl` as its `url` prop.
     6.  **`react-pdf`'s `Document` Component**: The `Document` component inside
     `PdfViewer` has `key={url}`. When the `url` prop changes, React sees a new
     key and unmounts the old `Document` component and mounts a new one. This is
     the intended behavior to load a new PDF when the URL changes.
     7.  **The Loop**: The problem is that `scoreService.getScorePdfUrl(scoreId)`
     likely returns a *new string instance* on every call, even if the URL value
     is identical. When `AdaptivePdfViewer` re-renders for any reason (e.g., its
     parent re-renders), the `useEffect` hook might re-run, `getScorePdfUrl`
     creates a new string object, `setPdfUrl` is called, and the whole process
     repeats, causing the `Document` component to re-mount and re-fetch the PDF
     endlessly.

     The `handleError` function in `AdaptivePdfViewer` is also problematic. It
     calls `setUseImageViewer(false)` and `setPdfUrl(...)` again, which can
     contribute to re-rendering cycles, although the primary issue is the unstable
      `pdfUrl`.

     ### The Solution

     To fix this, we need to ensure that the `pdfUrl` passed to `PdfViewer` is
     stable across re-renders and only changes when the `scoreId` actually
     changes. The `pdf-loading-issue.md` correctly identifies that `useMemo` is
     the right tool for this.

     However, the `useEffect` in `AdaptivePdfViewer` should be refactored to not
     set state on every render.

     Here is the step-by-step plan to fix the issue:

     1.  **Memoize the PDF URL**: In `AdaptivePdfViewer.tsx`, I will use the
     `useMemo` hook to calculate the `pdfUrl`. This ensures that
     `scoreService.getScorePdfUrl(scoreId)` is only called when `scoreId` changes,
      and the resulting URL string instance remains stable between re-renders.
     2.  **Refactor `AdaptivePdfViewer`**: I will remove the `useEffect` that sets
      the `pdfUrl` and instead rely on the memoized value.
     3.  **Stabilize `onError` Handler**: I will refactor the `handleError`
     function in `AdaptivePdfViewer.tsx` to prevent it from causing unnecessary
     re-renders.

````
