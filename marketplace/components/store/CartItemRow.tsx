'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/pricing'
import type { CartItem } from '@/types'

export default function CartItemRow({ item }: { item: CartItem }) {
  const [quantity, setQuantity] = useState(item.quantity)
  const [removing, setRemoving] = useState(false)

  async function updateQty(newQty: number) {
    setQuantity(newQty)
    await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: item.productId, quantity: newQty }),
    })
    window.dispatchEvent(new Event('cart-updated'))
    if (newQty <= 0) window.location.reload()
  }

  async function remove() {
    setRemoving(true)
    await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: item.productId }),
    })
    window.dispatchEvent(new Event('cart-updated'))
    window.location.reload()
  }

  return (
    <div className="flex gap-4 bg-white border border-gray-200 rounded-xl p-4">
      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden relative shrink-0">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/products/${item.slug}`} className="font-medium text-gray-900 hover:underline text-sm line-clamp-2">
          {item.name}
        </Link>
        <p className="font-bold text-gray-900 mt-1">{formatPrice(item.price)}</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button onClick={() => updateQty(quantity - 1)} className="px-2 py-1 hover:bg-gray-100 text-sm">−</button>
            <span className="px-3 py-1 text-sm border-x border-gray-300">{quantity}</span>
            <button onClick={() => updateQty(quantity + 1)} className="px-2 py-1 hover:bg-gray-100 text-sm">+</button>
          </div>
          <button onClick={remove} disabled={removing} className="text-xs text-red-500 hover:text-red-700">Remove</button>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold text-gray-900">{formatPrice(item.price * quantity)}</p>
      </div>
    </div>
  )
}
