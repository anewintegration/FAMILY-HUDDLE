import PersonPage from '@/components/PersonPage'

export default function BenjaminPage({ searchParams }: { searchParams: { category?: string } }) {
  return <PersonPage slug="benjamin" categoryFilter={searchParams.category} />
}
