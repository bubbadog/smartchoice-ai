/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string
      user?: {
        id: string
        email: string
      }
    }
  }
}

export {}