'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import CartIcon from './CartIcon'

export default function StoreHeader({ user }: { user: User | null }) {
  const [searchQuery, setSearchQuery] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-6">
        <Link href="/" className="text-xl font-bold text-gray-900 shrink-0">
          Marketplace
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products…"
              className="w-full border border-gray-300 rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>

        <nav className="flex items-center gap-4 shrink-0">
          {user ? (
            <Link href="/account" className="text-sm text-gray-600 hover:text-gray-900">My Account</Link>
          ) : (
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
          )}
          <CartIcon />
        </nav>
      </div>
    </header>
  )
}
