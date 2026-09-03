# The Morse Family Huddle

A private family dashboard: a shared "Must Do" calendar (Today / Tomorrow /
This Week), a Family roster view, a Parents page, individual tabs for each
parent and child with category filters, September Goals, a Family Bucket
List, and an open Family Whiteboard anyone can post to.

- Dad and Mom (role PARENT) see everyone's calendar and tasks, plus the
  Parents-only pages (Family roster, Parents, Goals, Bucket List).
- Benjamin and Bradley (role CHILD) only see their own tab, the shared
  Dashboard (filtered to their own items), Tasks, and the Family Whiteboard.
  Trying to visit `/family`, `/mom-and-dad`, `/goals`, `/bucket-list`, `/dad`
  or `/mom` redirects them back to their own page.

## Features

- **Dashboard** - three "Must Do" buckets (Today, Tomorrow, This Week) with
  a bullet preview on each card, an inline "+ Add task" form scoped to
  whichever bucket is open, and a "Due now / Due soon / Overdue" status
  badge computed from the real due date. The This Week card has forward/back
  arrows to plan ahead into future weeks.
- **Categories** - kids get Sports / Health / School / Friends / Family;
  parents get Family / Work / Personal. Filterable on each person's page.
- **Mom & Dad Top of Mind** - a running list of free-form notes on the
  dashboard, parents only.
- **Family** - a roster view, one card per person, showing their next couple
  of events and open tasks.
- **Parents** - combined view of anything assigned to Dad, Mom, or shared
  "Parents" tasks/events.
- **September Goals** / **Family Bucket List** - simple parent-only
  checklists.
- **Family Whiteboard** - an open feed anyone in the family (including the
  kids) can post thoughts, questions, or ideas to.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind (warm palette: dark tan
  background, sage-mist cards, sage/terracotta/gold accents, Space Grotesk +
  Inter fonts)
- Prisma + Postgres
- NextAuth (credentials login, JWT sessions)

## Local setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (a local or
   hosted Postgres instance) and a random `NEXTAUTH_SECRET`
   (`openssl rand -base64 32`).
3. Create the database tables:
   ```
   npx prisma migrate dev --name init
   ```
4. Seed the four family accounts and sample data (edit passwords in
   `prisma/seed.ts` first):
   ```
   npm run seed
   ```
5. Run the app:
   ```
   npm run dev
   ```
   Visit http://localhost:3000 and sign in with one of the seeded
   usernames (dad, mom, benjamin, bradley).

## Deploying to Render

1. Push this project to a GitHub repo.
   - **Windows/PowerShell shortcut:** create an empty repo on GitHub first
     (no README/gitignore), then from this folder run:
     ```
     .\push-to-github.ps1 -RepoUrl "https://github.com/yourusername/family-dashboard.git"
     ```
     This initializes git, commits everything, and pushes to GitHub for you.
2. In Render, create a new **Postgres** database first. Copy its
   "Internal Database URL" (if your web service will live in the same
   Render region) or "External Database URL".
3. Create a new **Web Service** from your repo:
   - Build command: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - Start command: `npm start`
4. Add environment variables on the web service:
   - `DATABASE_URL` - from step 2
   - `NEXTAUTH_SECRET` - a random string
   - `NEXTAUTH_URL` - your Render URL, e.g. `https://our-family.onrender.com`
5. After the first deploy, run the seed script once from the Render
   shell (Dashboard -> your service -> Shell):
   ```
   npm run seed
   ```
6. Change the default seed passwords immediately after first login
   (a "change password" screen isn't built yet - for now, edit
   `prisma/seed.ts` and re-run `npm run seed`, which upserts by
   username).

## Displaying on a home screen

Once deployed, any browser can point at your Render URL. For an
always-on kitchen display, use a spare tablet, laptop, or a device like
an Amazon Fire tablet in kiosk/browser mode pointed at your URL, signed
in as whichever family member should be shown.

## Project structure

- `src/app/dashboard` - shared dashboard: three Must Do buckets, inline
  add-task, Mom & Dad Top of Mind
- `src/app/family` - roster view of everyone (parents only)
- `src/app/mom-and-dad` - "Parents" combined view
- `src/app/{benjamin,bradley,dad,mom}` - individual tabs with category filters
- `src/app/goals`, `src/app/bucket-list` - checklist pages (parents only)
- `src/app/whiteboard` - Family Whiteboard, open to everyone
- `src/app/tasks` - full task list with add/complete, filtered by role
- `src/app/api/*` - REST-ish endpoints for tasks, events, top-of-mind
  notes, checklist items, and whiteboard posts
- `src/lib/categories.ts` - category taxonomy and the Overdue/Due now/Due
  soon status-badge logic
- `src/lib/data.ts` - shared visibility rules and dashboard bucket queries
- `src/middleware.ts` - enforces that kids can't view parent-only tabs
- `prisma/schema.prisma` - User / Task / Event / TopOfMindNote /
  ChecklistItem / WhiteboardPost models
- `prisma/seed.ts` - creates the four family logins plus sample content

## Color palette

- Dark tan `#D8CBA8` - page background
- Sage mist `#DCE3D3` - card background
- Sage `#7C9473` / Terracotta `#C97B5C` / Gold `#D4A24C` - accents
- Charcoal `#3D3D3A` - text
- Space Grotesk - headings and numbers; Inter - body text

## Next steps / ideas

- Google Calendar sync so each person's existing calendar feeds the
  dashboard automatically
- A settings/change-password page
- Recurring tasks (chores that repeat weekly)
- Push notifications or a daily digest
- Streaks/completion percentage per person
