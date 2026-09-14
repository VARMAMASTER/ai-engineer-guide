import type { Metadata } from 'next'
import CompanyIndex from '@/components/CompanyIndex'

export const metadata: Metadata = {
  title: 'Companies | Unyfide',
}

export default function CompaniesPage() {
  return <CompanyIndex />
}
