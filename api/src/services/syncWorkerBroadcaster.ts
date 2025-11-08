import type { Env } from '../index'

export type PlanningBroadcastEvent =
  | {
      type: 'PLAN_CREATED' | 'PLAN_UPDATED'
      plan: Record<string, unknown>
      occurrences?: Record<string, unknown>[]
      seq: number
    }
  | {
      type: 'PLAN_OCCURRENCE_COMPLETED'
      occurrence: Record<string, unknown>
      seq: number
    }

const getSyncWorkerBaseUrl = (env: Env): string => {
  const environment = (env.ENVIRONMENT || '').toLowerCase()

  if (environment === 'local') {
    return 'http://sync-mirubato.localhost:8787'
  }

  if (environment === 'staging') {
    return 'https://sync-staging.mirubato.com'
  }

  return 'https://sync.mirubato.com'
}

export async function broadcastPlanningEvents(
  env: Env,
  userId: string,
  events: PlanningBroadcastEvent[]
): Promise<void> {
  if (!events.length) {
    return
  }

  try {
    const baseUrl = getSyncWorkerBaseUrl(env)
    const url = `${baseUrl}/broadcast`

    const payload = {
      userId,
      events: events.map(event => ({
        ...event,
        timestamp: new Date().toISOString(),
      })),
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Worker-Auth': env.JWT_SECRET,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.warn(
        '[Sync Broadcast] Failed to broadcast planning events:',
        response.status,
        response.statusText
      )
    }
  } catch (error) {
    console.error('[Sync Broadcast] Error broadcasting planning events:', error)
  }
}
