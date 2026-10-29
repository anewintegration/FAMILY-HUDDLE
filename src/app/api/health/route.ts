import { NextResponse } from 'next/server'

// A tiny "are you there?" answer. The fridge iPad asks this before it refreshes the screen
// (and the "Reconnecting" page asks it too), so a Wi-Fi blip or a restart on the server never
// turns into a dead error page. It needs no sign-in and never touches the database.
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
