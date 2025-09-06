# IMSLP Integration Specification

## Purpose

The IMSLP (International Music Score Library Project) integration provides access to the world's largest collection of public domain sheet music, allowing users to import scores directly into their Mirubato library without manual downloading and uploading.

## Why IMSLP Integration Matters

IMSLP contains over 700,000 scores of public domain music. Without integration, users must:

- Navigate IMSLP's complex interface separately
- Download PDFs manually
- Re-upload to Mirubato
- Enter metadata manually
- Manage duplicate files

Integration streamlines this into a single search-and-import flow while respecting IMSLP's terms of service.

## Integration Architecture

### IMSLP's Structure Understanding

**Key Concepts**:

- **Work Pages**: Compositions (e.g., "Moonlight Sonata")
- **Score Entries**: Different editions/arrangements
- **File Entries**: Actual PDF files
- **Contributor Pages**: Uploader information
- **Copyright Status**: Varies by country

### API Limitations and Workarounds

**Reality**: IMSLP has no official API.

**Approach**: Respectful web scraping with:

- Caching to minimize requests
- Rate limiting (1 request/second)
- User-Agent identification
- Robots.txt compliance
- CDN URL pattern recognition

## Core Integration Features

### 1. Search Interface

**Purpose**: Find scores without leaving Mirubato.

**Search Strategy**:

```typescript
interface IMSLPSearch {
  // Search methods
  methods: {
    directUrl: (url: string) => Promise<Score>
    workTitle: (title: string) => Promise<Work[]>
    composer: (name: string) => Promise<Composer>
    catalogue: (opus: string) => Promise<Work[]>
  }

  // Search flow
  async search(query: string): Promise<SearchResult> {
    // 1. Check if query is IMSLP URL
    if (this.isIMSLPUrl(query)) {
      return await this.importDirectUrl(query)
    }

    // 2. Search IMSLP work pages
    const searchUrl = `https://imslp.org/wiki/Special:Search?search=${encodeURIComponent(query)}`
    const results = await this.scrapeSearchResults(searchUrl)

    // 3. Parse and enrich results
    return await this.enrichResults(results)
  }
}
```

**Caching Layer**:

```typescript
interface IMSLPCache {
  // Cache work metadata for 30 days
  works: Map<string, {
    data: WorkMetadata
    timestamp: number
    ttl: 30 * 24 * 60 * 60 * 1000
  }>

  // Cache search results for 1 day
  searches: Map<string, {
    results: SearchResult[]
    timestamp: number
    ttl: 24 * 60 * 60 * 1000
  }>

  // Never cache PDFs (respect copyright)
}
```

### 2. Work Page Parsing

**Purpose**: Extract structured data from IMSLP pages.

**Data Extraction**:

```typescript
interface WorkPageParser {
  async parseWorkPage(url: string): Promise<WorkData> {
    const html = await this.fetchWithCache(url)

    return {
      // Basic metadata
      title: this.extractTitle(html),
      composer: this.extractComposer(html),
      opus: this.extractOpusNumber(html),
      key: this.extractKey(html),

      // Musical metadata
      instrumentation: this.extractInstrumentation(html),
      movements: this.extractMovements(html),
      duration: this.extractDuration(html),
      yearComposed: this.extractYear(html),

      // Available scores
      scores: this.extractScoreList(html),

      // Copyright status
      copyright: this.extractCopyright(html),

      // IMSLP specific
      workId: this.extractWorkId(url),
      uploadDate: this.extractUploadDate(html),
      contributor: this.extractContributor(html)
    }
  }

  // Extract score download links
  extractScoreList(html: string): ScoreEntry[] {
    // Pattern: PDF links follow predictable structure
    const pattern = /\/files\/imglnks\/usimg\/[a-f0-9]\/[a-f0-9]{2}\/IMSLP\d+-PMLP\d+-[\w-]+\.pdf/g
    const matches = html.matchAll(pattern)

    return Array.from(matches).map(match => ({
      url: `https://imslp.org${match[0]}`,
      description: this.extractDescription(match),
      pages: this.extractPageCount(match),
      fileSize: this.extractFileSize(match),
      publisher: this.extractPublisher(match)
    }))
  }
}
```

### 3. Score Import Workflow

**Purpose**: Seamlessly import selected scores.

**Import Process**:

```typescript
interface IMSLPImporter {
  async importScore(
    imslpUrl: string,
    selectedEdition?: ScoreEntry
  ): Promise<Score> {
    // 1. Parse work page
    const workData = await this.parseWorkPage(imslpUrl)

    // 2. Select edition (or use default)
    const edition = selectedEdition || this.selectBestEdition(workData.scores)

    // 3. Handle copyright warning
    await this.showCopyrightNotice(workData.copyright)

    // 4. Download PDF (with progress)
    const pdfBuffer = await this.downloadWithProgress(edition.url)

    // 5. Process as regular upload
    const file = new File([pdfBuffer], `${workData.title}.pdf`)
    const score = await this.scoreService.upload(file)

    // 6. Enrich with IMSLP metadata
    await this.enrichScore(score, workData)

    // 7. Add attribution
    score.source = 'imslp'
    score.sourceUrl = imslpUrl
    score.attribution = `From IMSLP - ${workData.contributor}`

    return score
  }

  selectBestEdition(scores: ScoreEntry[]): ScoreEntry {
    // Prefer: Urtext > Clean scan > Most pages > Newest
    return scores.sort((a, b) => {
      if (a.description.includes('Urtext')) return -1
      if (b.description.includes('Urtext')) return 1
      if (a.quality > b.quality) return -1
      if (b.quality > a.quality) return 1
      return b.pages - a.pages
    })[0]
  }
}
```

### 4. Copyright Compliance

**Purpose**: Respect copyright laws and IMSLP's terms.

**Copyright Handling**:

```typescript
interface CopyrightCompliance {
  // Check copyright status
  async checkCopyright(work: WorkData): Promise<CopyrightStatus> {
    return {
      publicDomainUSA: work.copyright.usa === 'public',
      publicDomainEU: work.copyright.eu === 'public',
      publicDomainCanada: work.copyright.canada === 'public',
      userCountry: await this.detectUserCountry(),
      canImport: this.canImportInCountry(work.copyright, this.userCountry)
    }
  }

  // Show appropriate warning
  async showCopyrightNotice(status: CopyrightStatus) {
    if (!status.canImport) {
      throw new Error(`This work is not in public domain in your country (${status.userCountry})`)
    }

    if (status.restrictions) {
      await this.showModal({
        title: 'Copyright Notice',
        message: status.restrictions,
        actions: ['I Understand', 'Cancel']
      })
    }
  }

  // IMSLP attribution
  generateAttribution(work: WorkData): string {
    return `This score downloaded from IMSLP (https://imslp.org).
      Work: ${work.title} by ${work.composer}
      Contributed by: ${work.contributor}
      IMSLP Work ID: ${work.workId}
      Downloaded: ${new Date().toISOString()}`
  }
}
```

### 5. Batch Import

**Purpose**: Import multiple movements or complete collections.

**Batch Features**:

```typescript
interface BatchImport {
  // Import complete work (all movements)
  async importCompleteWork(workUrl: string): Promise<Score[]> {
    const work = await this.parseWorkPage(workUrl)
    const scores = []

    for (const movement of work.movements) {
      const score = await this.importScore(movement.url)
      score.metadata.movement = movement.number
      score.metadata.movementTitle = movement.title
      scores.push(score)
    }

    // Group as collection
    await this.createCollection({
      name: work.title,
      scores: scores.map(s => s.id),
      description: `Complete ${work.title} imported from IMSLP`
    })

    return scores
  }

  // Import composer collection
  async importComposerWorks(composer: string, filter?: WorkFilter): Promise<Score[]> {
    const works = await this.searchComposer(composer)
    const filtered = filter ? works.filter(filter) : works

    // Rate limit batch imports
    const scores = []
    for (const work of filtered) {
      scores.push(await this.importScore(work.url))
      await this.delay(2000) // 2 seconds between imports
    }

    return scores
  }
}
```

## User Interface

### Search Interface

```
┌─────────────────────────────────────┐
│ Search IMSLP                        │
│ ┌─────────────────────────────────┐ │
│ │ 🔍 Beethoven Sonata...          │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Results:                            │
│ ┌─────────────────────────────────┐ │
│ │ Piano Sonata No.14 (Moonlight)  │ │
│ │ Ludwig van Beethoven             │ │
│ │ 12 editions available            │ │
│ │ [View] [Quick Import]            │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Piano Sonata No.8 (Pathétique)  │ │
│ │ Ludwig van Beethoven             │ │
│ │ 8 editions available             │ │
│ │ [View] [Quick Import]            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Edition Selection

```
┌─────────────────────────────────────┐
│ Select Edition                      │
├─────────────────────────────────────┤
│ ⭐ Urtext Edition (Recommended)     │
│    Publisher: Henle                 │
│    Pages: 12 | Size: 1.2MB          │
│    [Preview] [Import]               │
├─────────────────────────────────────┤
│ 📄 First Edition                    │
│    Publisher: Artaria (1802)        │
│    Pages: 14 | Size: 3.5MB          │
│    [Preview] [Import]               │
├─────────────────────────────────────┤
│ 🎹 Simplified Arrangement           │
│    Level: Intermediate              │
│    Pages: 8 | Size: 0.8MB           │
│    [Preview] [Import]               │
└─────────────────────────────────────┘
```

## Performance Optimization

### Request Management

**Rate Limiting**:

```typescript
class RateLimiter {
  private lastRequest: number = 0
  private requestQueue: Promise<any>[] = []

  async throttle<T>(request: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequest

    if (timeSinceLastRequest < 1000) {
      await this.delay(1000 - timeSinceLastRequest)
    }

    this.lastRequest = Date.now()
    return await request()
  }
}
```

### Caching Strategy

**Cache Levels**:

1. **Memory Cache**: Recent searches (1 hour)
2. **KV Cache**: Work metadata (30 days)
3. **Local Storage**: User's import history
4. **No PDF Caching**: Respect copyright

## Error Handling

### Common Issues

| Issue                  | Cause                   | Solution                       |
| ---------------------- | ----------------------- | ------------------------------ |
| Page structure changed | IMSLP updates           | Fallback parsers, notify admin |
| Rate limited           | Too many requests       | Exponential backoff            |
| PDF download fails     | CDN issues              | Retry with different mirror    |
| Copyright blocked      | Geographic restrictions | Clear messaging to user        |
| Work not found         | Removed or moved        | Search alternatives            |

### Graceful Degradation

```typescript
class IMSLPFallback {
  async import(query: string): Promise<Score | null> {
    try {
      // Try direct import
      return await this.directImport(query)
    } catch (e1) {
      try {
        // Try search and import
        return await this.searchAndImport(query)
      } catch (e2) {
        // Provide manual instructions
        return await this.showManualInstructions(query)
      }
    }
  }
}
```

## Best Practices

### For Implementation

1. **Respect IMSLP**: Follow robots.txt, rate limit, attribute
2. **Cache Aggressively**: Minimize requests to IMSLP
3. **Handle Changes**: IMSLP structure changes regularly
4. **Clear Attribution**: Always credit IMSLP and contributors
5. **Copyright First**: Never bypass copyright checks

### For Users

1. **Verify Editions**: Check quality before importing
2. **Respect Copyright**: Only import public domain works
3. **Report Issues**: IMSLP links change frequently
4. **Support IMSLP**: Consider donating to IMSLP
5. **Local Backup**: Keep copies of important scores

## Legal Considerations

### Terms of Service Compliance

- Identify as Mirubato in User-Agent
- Include IMSLP attribution on all imports
- Respect copyright laws by country
- Don't circumvent access restrictions
- No automated mass downloading

### Attribution Requirements

Every imported score must include:

- Link back to IMSLP work page
- Contributor name
- Download date
- IMSLP work ID

## Success Metrics

**Usage Metrics**:

- Daily IMSLP searches
- Import success rate
- Edition selection distribution
- Error rates by type

**Value Metrics**:

- Time saved vs manual process
- Score library growth rate
- User retention correlation
- Repertoire diversity increase

## Related Documentation

- [Scorebook](../05-features/scorebook.md) - Score management system
- [AI Services](./ai-services.md) - Metadata extraction
- [Third-Party](./third-party.md) - Other integrations
- [Legal](../appendix/legal.md) - Copyright compliance

---

_Last updated: December 2024 | Version 1.7.6_
