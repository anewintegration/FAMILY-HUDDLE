# Huddle (The Morse Family)

A private family dashboard: a "Must Do" calendar (Today / Tomorrow / This
Week), a month calendar view, a Family roster, a Parents page, individual
tabs for each parent and child with category filters, monthly Goals (with
carry-over), a Family Bucket List, a dedicated Events page, and an open
Family Whiteboard anyone can post to. Every task and event can be checked
off, edited, rescheduled or deleted from any screen it appears on, and can
repeat every week, every other week or every month until a date you pick.

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
- `src/app/goals` - monthly goals with month arrows and carry-over (parents only)
- `src/app/bucket-list` - family bucket list (parents only)
- `src/app/account` - change your own password, sign out
- `src/components/EditableTaskRow.tsx`, `EditableEventRow.tsx` - the one task /
  event row used on every screen (check off, edit, reschedule, delete)
- `src/app/whiteboard` - Family Whiteboard, open to everyone
- `src/app/tasks` - full task list
- `src/app/api/*` - tasks, events, top-of-mind notes, checklist items,
  whiteboard posts, and `health` (a no-sign-in "are you there?" answer)
- `src/components/AutoRefresh.tsx`, `KioskMode.tsx`,
  `ServiceWorkerRegister.tsx` and `public/sw.js`, `public/offline.html` -
  the fridge iPad behaviour described above (`public/sw.js` also shows alerts)
- `src/app/api/push` (with `prefs` and `test`) - sign a phone or computer up
  for alerts, save a person's four alert choices, send a test alert
- `src/lib/push.ts` - the sender; makes and stores the server's alert keys
  the first time they are needed, and forgets devices that no longer exist
- `src/lib/alerts.ts` - who is told what when something is added, changed,
  finished or removed, or posted on the whiteboard
- `src/lib/reminders.ts` and `src/instrumentation.ts` - the once-a-minute
  loop behind the 30-minute reminders and the 7 AM briefing
- `src/lib/pushClient.ts`, `src/components/AlertsCard.tsx`,
  `AlertsPrompt.tsx` - turning alerts on and off from a device
- `src/lib/recurrence.ts` - the rules for repeating tasks and events: the
  dates, the checks, and what "this and all following" changes; the Repeat
  boxes, the badge and the "just this one" choice are in
  `src/components/RowBits.tsx`
- `src/lib/zoom.ts` and `src/components/ScreenSize.tsx` - the `?zoom=` size
  setting (the script runs in the page head, see `src/app/layout.tsx`) and
  the "Back to normal size" note on My account
- `src/lib/categories.ts` - category taxonomy + status badge logic
- `src/lib/data.ts` - visibility rules, bucket/month/progress queries
- `src/lib/dates.ts` - local-calendar date helpers (no UTC day drift)
- `src/lib/rows.ts` - who may change what, per viewer
- `src/middleware.ts` - kid route restrictions
- `prisma/schema.prisma` - data model
- `prisma/seed.ts` - four family logins + sample content

## On the fridge iPad

One-time setup on the iPad:

1. In Safari, open the site, tap Share, then Add to Home Screen (leave
   "Open as Web App" on if you see it). Open Huddle from the new icon and
   sign in there.
2. Settings > Display & Brightness > Auto-Lock > Never (keep it plugged in).
3. Settings > Accessibility > Guided Access: turn it on and set a passcode.
4. Open Huddle from its icon, triple-click the top button, make sure Touch
   and Keyboards are on, and tap Start. Now nobody can leave Huddle. To
   exit, triple-click the top button and enter the passcode (double-click on
   iPadOS 18 or earlier).
5. Use a spare Apple ID, or turn off notifications, so texts don't pop up
   on the fridge.

What Huddle does by itself when it runs from an iPad's Home Screen
("kiosk mode"):

- Re-reads the server every minute, and the moment the screen wakes up or
  the Wi-Fi returns. It asks `/api/health` first; if the server can't be
  reached it shows a small "Reconnecting" note and keeps trying.
- If a whole page can't load (Wi-Fi or server down), the small helper in
  `public/sw.js` shows a "Reconnecting to Huddle" page (`public/offline.html`)
  instead of an error page, and brings the same page back by itself. It
  keeps no other copies of anything, so it never shows old data.
- Blocks pinch and double-tap zoom, text selection and long-press menus.
- After 5 quiet minutes, returns to the Dashboard (never while someone is
  typing, and never from the sign-in page).

Phones, laptops and the iPad inside Safari are untouched. To force kiosk
mode on or off for one device, open Huddle there once with `?kiosk=1` or
`?kiosk=0`; it remembers.

Everything is sized for fingers (44px minimum buttons and boxes), and the
header, week card and calendar day panel stay put while a list scrolls.
Signing out lives on My account (tap your round letter, top right), so a
stray tap can't log the fridge out; logins last 90 days.

## Alerts on phones and computers

Huddle sends real alerts (the kind that buzz a phone or pop up on a
computer) for:

- a task or event someone adds, moves, reschedules, changes or cancels
- a finished task (parents hear when a kid finishes one; anyone hears when
  someone else finishes a task they set)
- a new whiteboard post
- a heads-up 30 minutes before something starts
- a 7 AM briefing of what is on today

There is no extra app and no cost. You only hear about things you can see on
your own dashboard, and never about something you just did yourself.

Turn alerts on, once per device:

- **iPhone or iPad (iOS 16.4 or newer):** open Huddle in Safari, tap Share,
  then Add to Home Screen (leave "Open as Web App" on). Open Huddle from the
  new icon, sign in, tap Turn on alerts, then Allow.
- **Android:** open Huddle in Chrome, tap Turn on alerts, then Allow.
- **Windows or Mac:** open Huddle in Chrome, Edge or Firefox (or Safari on
  macOS 13 or newer), click Turn on alerts, then Allow.

The invitation shows on the Dashboard until alerts are on (tap Not now and it
stays away for two weeks). **My account** (tap your round letter, top right)
has Send a test alert, Turn off, and four checkboxes for which alerts you
want; the checkboxes apply to all of your devices. Signing out removes that
device from your list. The fridge iPad never asks for alerts.

How it works:

- Nothing to set up on the server. The first time alerts are used, Huddle
  makes its own alert keys and keeps them in the database (`AppSetting`);
  devices are listed in `PushSubscription`. The build's `prisma db push`
  adds those tables and the four alert checkboxes (all on to begin with).
- Alerts go out after a save has finished, so they never slow down or break
  adding a task. A device that was deleted or blocked alerts is dropped from
  the list the next time Huddle tries it.
- The reminders and the briefing come from a loop that starts with the web
  service (`src/instrumentation.ts`) and ticks once a minute, so the service
  has to stay awake; the paid Render plan does that. `AlertLog` remembers
  what was already sent, so nothing arrives twice.
- If the keys are ever lost (a new database, say), each device quietly signs
  up again the next time Huddle is opened on it.

## Making Huddle smaller (or bigger) on one screen

If Huddle looks too zoomed in somewhere (a laptop that shows it as its
wallpaper, say), put `?zoom=` and a percent on the end of the address, once:

    https://family-huddle.onrender.com/dashboard?zoom=70

That screen then shows Huddle at 70% from then on, even with the plain
address. Try 90, 80, 70, 60 until it fits; any size from 40 to 200 works. On a
1920 x 1080 laptop screen with Windows display scaling at 150%, about 70% is a
good first try.

`?zoom=100` (or `?zoom=off`) puts it back. So does My account, Back to normal
size, which only appears on a screen that has been resized. A mistyped size
(`?zoom=7`, `?zoom=abc`) is ignored and never undoes a saved one.

The size is kept in that browser only, not in the database, so nobody else's
phone or computer, and not the fridge, changes. It works in Chrome, Edge,
Safari, and Firefox 126 or newer.

## Repeating tasks and events

Every add form (Tasks, Events, the dashboard, and "Add to this day" on the
calendar) has a **Repeat** box: Doesn't repeat, Every week, Every other week,
Every month. Pick one and a **Repeat until** date appears. Huddle then makes
one ordinary task or event for every date, from the first one up to that day.
The pencil on an existing task or event has the same two boxes, to make it
repeat from then on.

- It has to start today or later, and can run for up to 2 years (a weekly
  repeat for two years is about 105 entries). Tasks need a due date to repeat.
- Every month keeps the same day of the month; in a shorter month it lands on
  that month's last day (the 31st gives Jan 31, Feb 28, Mar 31).
- Every entry keeps the first one's time of day. A task with no time stays
  "any time that day".
- Each entry is a normal task or event, so checking one off, moving it or
  renaming it leaves the others alone.
- Editing or deleting one entry of a repeat asks **Just this one** or **This
  and all following**. The earlier ones are never touched. A new name, category
  or person goes to the later ones too; a new day moves them the same way; a
  new time goes to all of them. Checking a task off never travels. Kids can
  only change their own.
- The Tasks and Events lists, a person's page and the open-task count show a
  repeating entry only when its turn is close (this week's for a weekly one,
  the next two weeks for every other week, the next month for monthly), so a
  year of Mondays does not bury everything else. The calendar and the dashboard
  show every date. The add form says so after it adds a repeat.
- A whole repeat sends one alert, not one per date ("Dad added a task ...
  every week until Thu, Nov 5"). The 30-minute reminders and the morning
  briefing work date by date, as for any other task or event.
- A repeat's pattern (every week, the end day) cannot be edited afterwards.
  To change it, delete from the entry where it should stop (This and all
  following), then add a new repeat.
- Each entry is a row in the database, tied to the others by `seriesId` and
  `repeat` on `Task` and `Event`. Render's build adds those new columns by
  itself (`prisma db push`) and leaves everything already there alone.

## Keeping the data safe

A free Render Postgres database expires 30 days after it was created and is
deleted 14 days after that, with no backups. Before relying on Huddle, open
the database in Render and, if it says Free, upgrade it to a paid plan (the
smallest is $6/month).
