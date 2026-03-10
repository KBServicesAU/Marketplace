'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Cart } from '@/types'

export default function CartIcon() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    function readCart() {
      try {
        const raw = document.cookie
          .split('; ')
          .find((r) => r.startsWith('marketplace_cart='))
          ?.split('=')[1]
        if (raw) {
          const cart: Cart = JSON.parse(decodeURIComponent(raw))
          setCount(cart.items.reduce((s, i) => s + i.quantity, 0))
        }
      } catch {}
    }
    readCart()
    window.addEventListener('cart-updated', readCart)
    return () => window.removeEventListener('cart-updated', readCart)
  }, [])

  return (
    <Link href="/cart" className="relative text-gray-700 hover:text-gray-900">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11H4L5 9z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
