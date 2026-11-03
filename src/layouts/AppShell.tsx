import type { ReactNode } from 'react'
import Header from '../components/navigation/Header'

export default function AppShell({ children }: { children: ReactNode }) {
  return <><Header />{children}</>
}
