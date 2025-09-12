---
Spec-ID: SPEC-INT-002
Title: IMSLP Integration
Status: 🚧 Experimental
Owner: @pezware
Last-Reviewed: 2025-09-11
Version: 1.7.6
---

# IMSLP Integration Specification

Status: 🚧 Experimental

## What

Direct import of public domain sheet music from IMSLP (International Music Score Library Project) into Mirubato's score library.

## Why

- IMSLP contains 700,000+ public domain scores
- Manual download/upload workflow is tedious
- Automatic metadata extraction from IMSLP pages
- Legal access to vast classical music repertoire
- Eliminates duplicate work for common scores

## How

- Web scraping with respectful rate limiting
- MediaWiki API for search functionality
- CDN URL pattern recognition for PDF access
- Metadata extraction from structured page data
- Queue-based processing to prevent timeouts

## Integration Architecture

### IMSLP Structure

**Key Components**:

- **Work Pages**: Individual compositions
- **Score Entries**: Different editions/arrangements
- **File Entries**: Actual PDFs with metadata
- **Copyright Tags**: Regional availability
- **Contributor Info**: Uploader/editor details

### Technical Approach

**No Official API**: IMSLP provides no REST API, requiring:

- MediaWiki API for search
- HTML parsing for metadata
- CDN URL pattern matching
- Respectful scraping practices

## Core Features

### 1. Search Integration

**Search Methods**:

- Direct URL import (paste IMSLP link)
- Title search via MediaWiki API
- Composer browsing
- Opus/catalogue number lookup

**Implementation**:

- MediaWiki Special:Search endpoint
- Results parsing and enrichment
- Thumbnail generation from first page

**Code**: `scores/src/api/handlers/import.ts`

### 2. Metadata Extraction

**Extracted Fields**:

- Title and subtitle
- Composer (normalized)
- Opus/catalogue numbers
- Instrumentation
- Key signature
- Time period
- Publisher information
- Copyright status

**Process**:

1. Parse IMSLP page structure
2. Extract from info boxes
3. Normalize composer names
4. Validate copyright status
5. Generate Mirubato metadata

### 3. PDF Import Flow

**Workflow**:

1. User provides IMSLP URL or searches
2. System fetches work page
3. Extracts available PDF options
4. User selects preferred edition
5. Download PDF to R2 storage
6. Process with AI for additional metadata
7. Add to user's library

**Rate Limiting**:

- 1 import per 10 minutes per user
- Prevents IMSLP server overload
- Cached results for common scores

### 4. Copyright Verification

**Regional Checks**:

- Verify public domain status
- Check user's region
- Display appropriate warnings
- Block copyrighted content

**Rules**:

- Life + 50/70 years varies by country
- Special rules for editions
- Government publications
- Pre-1929 US works

## Technical Implementation

### URL Patterns

**Work Pages**:

```
https://imslp.org/wiki/{Work_Title}_(Composer_Name)
```

**PDF CDN**:

```
https://imslp.org/wiki/Special:ImagefromIndex/{file_id}
https://cdn.imslp.org/images/d/d7/{filename}.pdf
```

### Scraping Strategy

**Respectful Practices**:

- User-Agent: "Mirubato/1.7.6"
- Respect robots.txt
- 1 second delay between requests
- Cache aggressively
- Handle 429/503 gracefully

### Caching

**Cache Layers**:

- Work metadata: 30 days
- Search results: 24 hours
- PDF URLs: 7 days
- Never cache actual PDFs

**Storage**:

- KV for metadata
- No local PDF storage
- Link to IMSLP for attribution

## Error Handling

### Common Issues

| Error           | Cause                  | Solution                   |
| --------------- | ---------------------- | -------------------------- |
| Page not found  | Work deleted/moved     | Show error, suggest search |
| PDF unavailable | Copyright or removed   | Explain restrictions       |
| Parse failure   | Page structure changed | Fallback to manual entry   |
| Rate limited    | Too many requests      | Queue and retry            |
| Network timeout | Slow IMSLP servers     | Retry with backoff         |

### Fallback Strategies

1. **Parsing fails**: Use filename for title
2. **No PDFs found**: Show work info only
3. **Copyright blocked**: Explain restrictions
4. **Server down**: Cache previous results

## Performance Optimization

### Request Minimization

- Cache everything possible
- Batch metadata lookups
- Reuse search results
- Share cache across users for public data

### Queue Processing

- Async import via Cloudflare Queues
- Prevents Worker timeout
- Allows retry on failure
- Progress tracking

## Code References

- Import handler: `scores/src/api/handlers/import.ts`
- Enhanced import: `scores/src/api/handlers/import-enhanced.ts`
- Queue consumer: `scores/src/queue-consumer.ts`
- Types: `scores/src/types/api.ts`

## Operational Limits

- **Import rate**: 1 per 10 minutes per user
- **Search cache**: 24 hour TTL
- **Work cache**: 30 day TTL
- **Max file size**: 50MB PDFs
- **Timeout**: 30 seconds for import

## Failure Modes

- **IMSLP down**: Use cached data, show notice
- **Structure change**: Parsing fails, manual fallback
- **Copyright violation**: Block import, explain
- **Rate limit hit**: Queue for later
- **PDF too large**: Reject with error message

## Monitoring

### Metrics

- Import success rate
- Average import time
- Cache hit rates
- Error frequency by type
- IMSLP response times

### Alerts

- Success rate < 80%
- Response time > 10s
- Parsing errors spike
- Copyright blocks increase

## Legal Considerations

### Terms of Service

- Respect IMSLP's non-commercial nature
- Provide attribution and links
- Don't redistribute PDFs
- Honor copyright by region

### Attribution

- Always link back to IMSLP work page
- Credit contributors
- Display copyright information
- Include IMSLP disclaimer

## Decisions

- **Scraping over API** (2024-03): No API available
- **Queue-based import** (2024-05): Prevent timeouts
- **No PDF storage** (2024-06): Link to IMSLP instead
- **Aggressive caching** (2024-07): Minimize requests
- **Rate limiting** (2024-08): Respect IMSLP servers

## Non-Goals

- Bulk import of entire collections
- Automated daily imports
- IMSLP account integration
- Upload to IMSLP from Mirubato
- Circumventing copyright restrictions

## Open Questions

- Should we contribute improvements back to IMSLP?
- How to handle IMSLP URL changes?
- Should we cache PDFs temporarily?
- How to detect copyright changes?
- Partnership opportunities with IMSLP?

## Security & Privacy Considerations

- **No user data to IMSLP**: Anonymous requests only
- **Copyright compliance**: Strict regional checks
- **Attribution required**: Legal obligation
- **Rate limiting**: Prevent abuse
- **Sanitize inputs**: Prevent XSS from scraped content

## Related Documentation

- [Scorebook Feature](../05-features/scorebook.md) - Score import details
- [AI Services](./ai-services.md) - Metadata extraction
- [Third-Party](./third-party.md) - Other integrations

---

Last updated: 2025-09-11 | Version 1.7.6
