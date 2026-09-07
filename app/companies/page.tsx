import type { Metadata } from 'next'
import CompanyIndex from '@/components/CompanyIndex'

export const metadata: Metadata = {
  title: 'Companies | AI Engineer Practice Guide',
}

export default function CompaniesPage() {
  return <CompanyIndex />
}
