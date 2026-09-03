import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Edit the passwords below before running `npm run seed`, or change them
// later by re-running this script (it upserts on username).
const FAMILY = [
  { username: 'dad', displayName: 'Dad', role: 'PARENT' as const, slug: 'dad', color: '#7C9473', password: 'changeme-dad' },
  { username: 'mom', displayName: 'Mom', role: 'PARENT' as const, slug: 'mom', color: '#C97B5C', password: 'changeme-mom' },
  { username: 'benjamin', displayName: 'Benjamin', role: 'CHILD' as const, slug: 'benjamin', color: '#4C86A8', password: 'changeme-ben' },
  { username: 'bradley', displayName: 'Bradley', role: 'CHILD' as const, slug: 'bradley', color: '#D4A24C', password: 'changeme-brad' },
]

function daysFromNow(days: number, hour = 9, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d
}

async function main() {
  const users: Record<string, { id: string }> = {}

  for (const member of FAMILY) {
    const passwordHash = await bcrypt.hash(member.password, 10)
    const user = await prisma.user.upsert({
      where: { username: member.username },
      update: {},
      create: {
        username: member.username,
        displayName: member.displayName,
        role: member.role,
        slug: member.slug,
        color: member.color,
        passwordHash,
      },
    })
    users[member.slug] = user
  }

  // Only seed sample content once (skip if tasks already exist, e.g. re-running seed).
  const existingTaskCount = await prisma.task.count()
  if (existingTaskCount === 0) {
    await prisma.event.createMany({
      data: [
        { title: 'Soccer practice', category: 'SPORTS', startTime: daysFromNow(0, 15, 30), ownerId: users.benjamin.id },
        { title: 'Supplier call', category: 'WORK', startTime: daysFromNow(0, 18, 0), ownerId: users.dad.id },
        { title: 'Bath and reading', category: 'HEALTH', startTime: daysFromNow(0, 19, 15), ownerId: users.bradley.id },
        { title: 'Book club', category: 'PERSONAL', startTime: daysFromNow(1, 20, 0), ownerId: users.mom.id },
        { title: 'Warehouse walkthrough', category: 'WORK', startTime: daysFromNow(4, 10, 0), ownerId: users.dad.id },
      ],
    })

    await prisma.task.createMany({
      data: [
        { title: "Sign field trip form", category: 'SCHOOL', dueDate: daysFromNow(-1), assigneeId: users.bradley.id, createdById: users.mom.id },
        { title: 'Finish math worksheet', category: 'SCHOOL', dueDate: daysFromNow(0), assigneeId: users.benjamin.id, createdById: users.dad.id },
        { title: "Pack Bradley's lunch", category: 'FAMILY', dueDate: daysFromNow(1), assigneeId: users.mom.id, createdById: users.mom.id },
        { title: 'Reschedule dentist', category: 'PERSONAL', dueDate: daysFromNow(4), assigneeId: users.mom.id, createdById: users.mom.id },
        { title: 'Call about warehouse quote', category: 'WORK', dueDate: daysFromNow(5), assigneeId: users.dad.id, createdById: users.dad.id },
        { title: "Sleepover at Max's house", category: 'FRIENDS', dueDate: daysFromNow(6), assigneeId: users.benjamin.id, createdById: users.dad.id },
        { title: 'Dentist checkup', category: 'HEALTH', dueDate: daysFromNow(3), assigneeId: users.bradley.id, createdById: users.mom.id },
      ],
    })

    await prisma.topOfMindNote.createMany({
      data: [
        { text: "Benjamin's cleats are getting tight - check sizing before next game" },
        { text: "Bradley's field trip form needs a check for the permission slip fee" },
        { text: "Confirm babysitter for Friday's supplier dinner" },
      ],
    })

    await prisma.checklistItem.createMany({
      data: [
        { kind: 'GOAL', text: 'Get Benjamin to soccer practice on time all month', createdById: users.dad.id },
        { kind: 'GOAL', text: 'Finish the family room redesign', createdById: users.dad.id },
        { kind: 'GOAL', text: 'Read together as a family 3 nights a week', done: true, createdById: users.mom.id },
        { kind: 'BUCKET_LIST', text: 'Weekend at Lake Sunapee', createdById: users.dad.id },
        { kind: 'BUCKET_LIST', text: 'Take the boys bowfishing', createdById: users.dad.id },
        { kind: 'BUCKET_LIST', text: 'Red Sox game together at Fenway', createdById: users.mom.id },
      ],
    })

    await prisma.whiteboardPost.createMany({
      data: [
        { text: "Can we get a new soccer ball? Mine's losing air.", authorId: users.benjamin.id },
        { text: 'So proud of how everyone pitched in with the family room this weekend. Love you all.', authorId: users.mom.id },
        { text: 'I want to try out for the school play!', authorId: users.bradley.id },
        { text: "Thinking about a family trip to Lake Sunapee before summer's out. Thoughts?", authorId: users.dad.id },
      ],
    })
  }

  console.log('Seeded family accounts and sample data. Default passwords are in prisma/seed.ts - change them after first login.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
