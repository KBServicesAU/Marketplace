'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard', icon: '◈' },
  { href: '/admin/suppliers', label: 'Suppliers', icon: '🏭' },
  { href: '/admin/categories', label: 'Categories', icon: '📂' },
  { href: '/admin/imports', label: 'Imports', icon: '⬆' },
  { href: '/admin/products', label: 'Products', icon: '📦' },
  { href: '/admin/orders', label: 'Orders', icon: '🛒' },
]

export default function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold">Marketplace Admin</h1>
      </div>
      <ul className="flex-1 py-4">
        {links.map((l) => {
          const active = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href)
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  active ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>{l.icon}</span>
                {l.label}
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="px-6 py-4 border-t border-gray-700">
        <Link href="/" className="text-xs text-gray-500 hover:text-gray-300">
          ← View Store
        </Link>
      </div>
    </nav>
  )
}
