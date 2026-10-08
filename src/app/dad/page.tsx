import PersonPage from '@/components/PersonPage'

export default function DadPage({ searchParams }: { searchParams: { category?: string } }) {
  return <PersonPage slug="dad" categoryFilter={searchParams.category} />
}
