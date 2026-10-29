// Next.js runs register() once each time the server starts. Huddle uses it to start the
// once-a-minute check that sends "starts in 30 min" reminders and the morning briefing.
// (Only on the real server: not while building, and not in the edge runtime.)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      try {
        const { startAlertLoop } = await import('./lib/reminders')
        startAlertLoop()
      } catch (e) {
        console.warn('alerts: reminders did not start:', e instanceof Error ? e.message : e)
      }
    }
  }
}
