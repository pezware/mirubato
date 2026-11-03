/**
 * zValidator with one validation-failure response for every dictionary route.
 *
 * zod 4 makes ZodError.issues non-enumerable, so the library default,
 * `c.json(result, 400)`, no longer sends the issues to the client.
 */
import { zValidator as honoZValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodType } from 'zod'

export const zValidator = <
  T extends ZodType,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T
) =>
  honoZValidator(target, schema, (result, c) => {
    if (!result.success) {
      // The zod 3 shape, so the 400 body that clients receive does not change.
      return c.json(
        {
          success: false,
          error: { name: result.error.name, issues: result.error.issues },
        },
        400
      )
    }
  })
