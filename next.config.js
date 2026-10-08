// Pin the server to Eastern time so "today" / "tomorrow" buckets line up with
// the family's actual day. Without this, Render runs in UTC and after ~8pm ET
// the server already thinks it's tomorrow, so tasks land in the wrong bucket.
process.env.TZ = 'America/New_York'

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
