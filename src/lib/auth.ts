import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Stay signed in for 90 days (the fridge iPad shouldn't ask for a password every month).
// Using Huddle quietly renews this, so a screen that is in use never expires.
const NINETY_DAYS = 60 * 60 * 24 * 90

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: NINETY_DAYS },
  jwt: { maxAge: NINETY_DAYS },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        // A touch keyboard can add a stray space or capital letter after a suggestion.
        const user = await prisma.user.findUnique({
          where: { username: credentials.username.trim().toLowerCase() },
        })
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          name: user.displayName,
          username: user.username,
          role: user.role,
          slug: user.slug,
          color: user.color,
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.slug = (user as any).slug
        token.color = (user as any).color
        token.username = (user as any).username
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.sub
        ;(session.user as any).role = token.role
        ;(session.user as any).slug = token.slug
        ;(session.user as any).color = token.color
        ;(session.user as any).username = token.username
      }
      return session
    },
  },
}
