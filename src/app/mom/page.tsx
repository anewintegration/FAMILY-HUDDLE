import PersonPage from '@/components/PersonPage'

export default function MomPage({ searchParams }: { searchParams: { category?: string } }) {
  return <PersonPage slug="mom" categoryFilter={searchParams.category} />
}
