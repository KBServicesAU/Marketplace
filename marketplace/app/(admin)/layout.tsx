'use client'

import { usePathname } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'

// Auth is handled by middleware.ts — this layout is UI only.
// The login page skips the sidebar via pathname check.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  )
}
