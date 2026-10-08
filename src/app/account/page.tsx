import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getOpenTaskCount } from '@/lib/data'
import Header from '@/components/Header'
import PasswordForm from './PasswordForm'
import SignOutButton from './SignOutButton'

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const openTaskCount = await getOpenTaskCount(user.role, user.id)

  return (
    <main className="min-h-screen">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <div className="w-full px-3 sm:px-4 py-4 max-w-xl">
        <p className="font-display text-xl font-semibold text-white mb-3">My account</p>

        <div className="card p-4 mb-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0" style={{ background: user.color || '#1B2340' }}>
            {String(user.name || '?')[0]}
          </div>
          <div>
            <p className="font-display text-[15px] font-semibold text-charcoal">{user.name}</p>
            <p className="text-xs text-charcoal-muted">
              Signed in as <span className="font-semibold">{user.username}</span> · {user.role === 'PARENT' ? 'Parent' : 'Kid'}
            </p>
          </div>
        </div>

        <PasswordForm />
        <SignOutButton />
      </div>
    </main>
  )
}
