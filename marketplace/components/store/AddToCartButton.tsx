'use client'

import { useState } from 'react'

interface Props {
  productId: string
  supplierId: string
  name: string
  slug: string
  price: number
  image: string | null
}

export default function AddToCartButton({ productId, supplierId, name, slug, price, image }: Props) {
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  async function handleAddToCart() {
    setLoading(true)
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, supplierId, name, slug, price, image, quantity: 1 }),
    })
    if (res.ok) {
      setAdded(true)
      window.dispatchEvent(new Event('cart-updated'))
      setTimeout(() => setAdded(false), 2000)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading}
      className={`w-full py-3 px-6 rounded-full font-semibold text-sm transition ${
        added
          ? 'bg-green-600 text-white'
          : 'bg-gray-900 text-white hover:bg-gray-700'
      } disabled:opacity-50`}
    >
      {loading ? 'Adding…' : added ? 'Added to Cart!' : 'Add to Cart'}
    </button>
  )
}
