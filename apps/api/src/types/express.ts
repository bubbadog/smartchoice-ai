/* eslint-disable @typescript-eslint/no-namespace */
import { JWTPayload } from '@smartchoice-ai/shared-types'

declare global {
  namespace Express {
    interface Request {
      apiVersion?: string
      user?: JWTPayload
    }
  }
}

export {}