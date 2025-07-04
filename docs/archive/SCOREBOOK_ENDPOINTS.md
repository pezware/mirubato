# Scorebook Endpoints Documentation

## Score Service Endpoints

### 1. Score Metadata

- **GET** `/api/scores/{scoreId}`
  - Returns score metadata from database
  - Includes: title, composer, pdf_url, processing_status, etc.

### 2. PDF Download

- **GET** `/api/scores/{scoreId}/download/pdf`
  - Serves the original PDF file from R2 storage
  - For imported scores: reads from path in `pdf_url` field
  - For test scores: serves from test-data directory
  - Returns 404 if file not found in R2
  - Returns 403 if private and user not authorized

### 3. Rendered Page Images

- **GET** `/api/pdf/v2/render/{scoreId}/page/{pageNumber}`
  - Serves pre-rendered WebP images of PDF pages
  - Falls back to on-demand rendering if not cached
  - Used by image-based PDF viewer

### 4. Direct File Access

- **GET** `/files/{path}`
  - Direct access to R2 storage files
  - Used for imported PDFs stored at `/files/imports/{scoreId}/{filename}`

### 5. Test Data

- **GET** `/api/test-data/{filename}`
  - Serves test PDF files
  - Used for demo scores

## Processing Status Flow

### Status Values

- `pending` - PDF uploaded, waiting for processing
- `processing` - Currently being analyzed/rendered
- `completed` - Successfully processed and rendered
- `failed` - Processing failed (see processing_error for details)

### Processing Steps

1. **Import**: PDF uploaded to R2 at `imports/{scoreId}/{filename}`
2. **Queue**: Message sent to PDF_QUEUE for processing
3. **Analysis**: PDF.js loads file and extracts page count
4. **Rendering**: Each page rendered as WebP image
5. **Storage**: Rendered pages stored at `rendered/{scoreId}/page-{n}.webp`
6. **Update**: Status set to 'completed' or 'failed'

### Common Failure Reasons

- "Waiting failed: 10000ms exceeded" - Browser timeout during rendering
- "Failed to analyze PDF" - PDF.js couldn't load the file
- "Failed to render page" - Specific page rendering failed
- Network timeouts fetching the PDF from R2

## Frontend URL Construction

The frontend uses different URLs based on score type:

1. **Test Scores**: Direct test-data URLs
   - Example: `https://scores.mirubato.com/api/test-data/score_01.pdf`

2. **Imported Scores**: Download endpoint
   - Pattern: `https://scores.mirubato.com/api/scores/{scoreId}/download/pdf`
   - Backend resolves this to actual R2 path from `pdf_url` field

3. **Image Scores**: Page-by-page images
   - Pattern: `https://scores.mirubato.com/api/scores/{scoreId}/pages/{pageNumber}`

## Why PDFs Fail to Display

1. **Processing Status Issue**: Frontend may check processing_status and refuse to display 'failed' scores
2. **URL Mismatch**: Frontend expects `/download/pdf` but score has direct `/files/` path
3. **CORS Issues**: If accessing files across domains without proper headers
4. **Missing Files**: Rendered pages not found for image viewer
5. **Worker Failures**: PDF.js worker can't load due to CSP or network issues

## Recovery Mechanisms

1. **Update Status in Database**:

   ```sql
   UPDATE scores SET processing_status = 'completed' WHERE processing_status = 'failed';
   ```

2. **Reprocess Failed Scores**:

   ```sql
   UPDATE scores SET processing_status = 'pending' WHERE processing_status = 'failed';
   ```

3. **Admin Endpoints**:
   - `/api/admin/reprocess-imports` - Requeues scores for processing

4. **Direct Database Updates**:
   - Can mark as 'completed' if PDF exists and metadata is correct
   - Processing mainly generates page images for alternative viewer
