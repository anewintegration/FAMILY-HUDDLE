// Pin the server to Eastern time so "today" / "tomorrow" buckets line up with
// the family's actual day. Without this, Render runs in UTC and after ~8pm ET
// the server already thinks it's tomorrow, so tasks land in the wrong bucket.
process.env.TZ = 'America/New_York'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Lets src/instrumentation.ts start the once-a-minute reminder check when the server starts.
    instrumentationHook: true,
    // The alerts sender is used as an ordinary installed package, not bundled into the pages.
    serverComponentsExternalPackages: ['web-push'],
  },
}

module.exports = nextConfig
