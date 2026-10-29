// Just the parts of the "web-push" package that Huddle uses (it ships without its own types).
declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  export interface RequestOptions {
    /** Seconds the push service may hold the message if the device is switched off. */
    TTL?: number
    urgency?: 'very-low' | 'low' | 'normal' | 'high'
    /** Milliseconds to wait for the push service before giving up. */
    timeout?: number
  }

  export interface SendResult {
    statusCode: number
    body: string
    headers: Record<string, string | string[] | undefined>
  }

  export function generateVAPIDKeys(): { publicKey: string; privateKey: string }
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | null,
    options?: RequestOptions
  ): Promise<SendResult>
}
