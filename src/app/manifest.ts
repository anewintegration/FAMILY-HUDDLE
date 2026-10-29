import type { MetadataRoute } from 'next'

// The web app manifest: what the phone or iPad uses when Huddle is added to the Home Screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Huddle - Morse Family',
    short_name: 'Huddle',
    description: 'Family dashboard, calendar, and tasks',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0A2540',
    theme_color: '#0A2540',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
  }
}
