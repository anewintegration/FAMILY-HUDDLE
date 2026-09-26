# Huddle (The Morse Family)

A private family dashboard: a "Must Do" calendar (Today / Tomorrow / This
Week), a month calendar view, a Family roster, a Parents page, individual
tabs for each parent and child with category filters, September Goals, a
Family Bucket List, a dedicated Events page, and an open Family Whiteboard
anyone can post to.

## Design

Redesigned with a full-width layout, rounded cards throughout, and a new
palette:

- Porcelain white background (`#FAFAF7`)
- Deep indigo (`#1B2340`) for structure - nav, hero, headings
- Coral (`#FF5A36`) - the one signature accent color
- Teal (`#00C2A8`) - progress and completion
- Amber (`#FFB238`) - attention/highlight badges

Fonts: Sora (headings, numbers) + Manrope (body).

The dashboard hero shows a time-aware greeting and a progress ring for
today's task completion.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind, Prisma + Postgres,
NextAuth (credentials login, JWT sessions).

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env`, fill in `DATABASE_URL` and a random
   `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
3. `npx prisma db push`
4. Edit passwords in `prisma/seed.ts`, then `npm run seed`.
5. `npm run dev`, sign in as dad / mom / benjamin / bradley.

## Deploying to Render

1. Push this project to a GitHub repo (see `push-to-github.ps1`).
2. Create a Postgres database on Render, copy its Internal Database URL.
3. Create a Web Service from the repo:
   - Build: `npm install && npx prisma generate && npx prisma db push && npm run build`
   - Start: `npm start`
4. Env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your
   Render URL).
5. After first deploy, open the Shell tab and run `npm run seed`.

## Project structure

- `src/app/dashboard` - hero with progress ring, three Must Do buckets,
  inline add-task, Mom & Dad Top of Mind
- `src/app/calendar` - month-grid calendar view
- `src/app/events` - dedicated events list + add form
- `src/app/family` - roster view (parents only)
- `src/app/mom-and-dad` - "Parents" combined view
- `src/app/{benjamin,bradley,dad,mom}` - individual tabs with category filters
- `src/app/goals`, `src/app/bucket-list` - checklist pages (parents only)
- `src/app/whiteboard` - Family Whiteboard, open to everyone
- `src/app/tasks` - full task list
- `src/app/api/*` - tasks, events, top-of-mind notes, checklist items,
  whiteboard posts
- `src/lib/categories.ts` - category taxonomy + status badge logic
- `src/lib/data.ts` - visibility rules, bucket/month/progress queries
- `src/middleware.ts` - kid route restrictions
- `prisma/schema.prisma` - data model
- `prisma/seed.ts` - four family logins + sample content
