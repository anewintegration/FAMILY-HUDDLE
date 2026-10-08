// Browser-side helper: one way to call the API so every button reports problems
// the same way (a plain sentence, never a silent failure).

// status is the HTTP status of a failed call (0 when the server could not be reached).
export type ApiResult = { ok: true; data: any } | { ok: false; error: string; status: number }

export async function api(method: 'POST' | 'PATCH' | 'DELETE', url: string, body?: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: (data && data.error) || 'Something went wrong. Please try again.', status: res.status }
    }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Could not reach the server. Check the Wi-Fi and try again.', status: 0 }
  }
}
