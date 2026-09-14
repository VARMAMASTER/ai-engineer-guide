import type { Metadata } from 'next'
import OpsShell from '../OpsShell'
import TasksSection from './TasksSection'

export const metadata: Metadata = {
  title: 'Ops — Tasks | Unyfide',
}

export default function OpsTasksPage() {
  return (
    <OpsShell current="/ops/tasks">
      <TasksSection />
    </OpsShell>
  )
}
