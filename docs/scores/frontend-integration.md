# Frontend Integration Guide

This guide shows how to integrate the Scores Service into the Mirubato frontend.

## API Client

Create a scores API client in the frontend:

```typescript
// frontend/src/services/scoresApi.ts
import {
  Score,
  Collection,
  ScoreSearchParams,
  RenderOptions,
} from '@/types/scores'

const SCORES_API_URL =
  import.meta.env.VITE_SCORES_API_URL || 'https://scores.mirubato.com'

export class ScoresAPI {
  private baseUrl: string

  constructor(baseUrl = SCORES_API_URL) {
    this.baseUrl = baseUrl
  }

  // Fetch a single score
  async getScore(id: string): Promise<Score> {
    const response = await fetch(`${this.baseUrl}/api/scores/${id}`)
    if (!response.ok) throw new Error('Failed to fetch score')
    const data = await response.json()
    return data.data
  }

  // Search scores
  async searchScores(
    params: ScoreSearchParams
  ): Promise<{ scores: Score[]; total: number }> {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value))
      }
    })

    const response = await fetch(`${this.baseUrl}/api/search?${queryParams}`)
    if (!response.ok) throw new Error('Failed to search scores')
    const data = await response.json()
    return data.data
  }

  // Get featured collections
  async getFeaturedCollections(): Promise<Collection[]> {
    const response = await fetch(
      `${this.baseUrl}/api/collections?featured=true`
    )
    if (!response.ok) throw new Error('Failed to fetch collections')
    const data = await response.json()
    return data.data
  }

  // Render a score
  async renderScore(id: string, options: RenderOptions): Promise<string> {
    const queryParams = new URLSearchParams()
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value))
      }
    })

    const response = await fetch(
      `${this.baseUrl}/api/scores/${id}/render?${queryParams}`
    )
    if (!response.ok) throw new Error('Failed to render score')
    const data = await response.json()
    return data.data.data // SVG string or base64 image
  }
}
```

## React Hook Example

```typescript
// frontend/src/hooks/useScores.ts
import { useQuery } from '@tanstack/react-query'
import { ScoresAPI } from '@/services/scoresApi'

const api = new ScoresAPI()

export function useScore(id: string) {
  return useQuery({
    queryKey: ['score', id],
    queryFn: () => api.getScore(id),
    enabled: !!id,
  })
}

export function useScoreSearch(params: ScoreSearchParams) {
  return useQuery({
    queryKey: ['scores', params],
    queryFn: () => api.searchScores(params),
  })
}

export function useFeaturedCollections() {
  return useQuery({
    queryKey: ['collections', 'featured'],
    queryFn: () => api.getFeaturedCollections(),
  })
}
```

## Score Display Component

```typescript
// frontend/src/components/ScoreViewer.tsx
import React, { useState } from 'react'
import { useScore } from '@/hooks/useScores'
import { ScoresAPI } from '@/services/scoresApi'

const api = new ScoresAPI()

export function ScoreViewer({ scoreId }: { scoreId: string }) {
  const { data: score, isLoading } = useScore(scoreId)
  const [currentPage, setCurrentPage] = useState(1)
  const [renderedScore, setRenderedScore] = useState<string | null>(null)

  useEffect(() => {
    if (score) {
      // Render the score
      api.renderScore(score.id, {
        format: 'svg',
        pageNumber: currentPage,
        theme: 'light'
      }).then(setRenderedScore)
    }
  }, [score, currentPage])

  if (isLoading) return <div>Loading score...</div>
  if (!score) return <div>Score not found</div>

  return (
    <div className="score-viewer">
      <h2>{score.title}</h2>
      <p>{score.composer}</p>

      {renderedScore && (
        <div
          className="score-display"
          dangerouslySetInnerHTML={{ __html: renderedScore }}
        />
      )}

      <div className="controls">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
          Previous
        </button>
        <span>Page {currentPage}</span>
        <button onClick={() => setCurrentPage(p => p + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}
```

## Environment Configuration

Add to your frontend `.env`:

```bash
# Development
VITE_SCORES_API_URL=http://localhost:8787

# Production
VITE_SCORES_API_URL=https://scores.mirubato.com
```

## CORS Configuration

The Scores Service is configured to accept requests from:

- `localhost:3000` (frontend dev)
- `mirubato.com` and subdomains
- Any `*.mirubato.com` domain

## Error Handling

```typescript
try {
  const score = await api.getScore(scoreId)
} catch (error) {
  if (error.response?.status === 404) {
    // Score not found
  } else if (error.response?.status === 429) {
    // Rate limited
  } else {
    // Other error
  }
}
```

## Caching

The Scores Service implements caching at the edge. For optimal performance:

1. Use consistent query parameters
2. Implement client-side caching with React Query
3. Consider prefetching popular scores

## File Upload

```typescript
async function uploadPDF(file: File, metadata: Partial<Score>) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('metadata', JSON.stringify(metadata))

  const response = await fetch(`${SCORES_API_URL}/api/import/pdf`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) throw new Error('Upload failed')
  return response.json()
}
```
