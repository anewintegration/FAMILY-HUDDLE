import PersonPage from '@/components/PersonPage'

export default function BradleyPage({ searchParams }: { searchParams: { category?: string } }) {
  return <PersonPage slug="bradley" categoryFilter={searchParams.category} />
}
