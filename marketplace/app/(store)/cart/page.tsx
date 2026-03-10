import { cookies } from 'next/headers'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/pricing'
import type { Cart, CartItem } from '@/types'
import CartItemRow from '@/components/store/CartItemRow'

async function getCart(): Promise<Cart> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('marketplace_cart')?.value
  if (!raw) return { items: [] }
  try { return JSON.parse(raw) as Cart } catch { return { items: [] } }
}

export default async function CartPage() {
  const cart = await getCart()
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0)

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
        <p className="text-gray-500 mb-8">Add some products to get started.</p>
        <Link href="/products" className="bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-700">
          Shop Now
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item: CartItem) => (
            <CartItemRow key={item.productId} item={item} />
          ))}
        </div>
        <div className="bg-gray-50 rounded-2xl p-6 h-fit">
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Shipping</span>
              <span className="text-gray-500">Calculated at checkout</span>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 mb-6">
            <div className="flex justify-between font-bold">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          </div>
          <Link
            href="/checkout"
            className="block w-full bg-gray-900 text-white text-center py-3 rounded-full font-semibold hover:bg-gray-700 transition"
          >
            Proceed to Checkout
          </Link>
          <Link href="/products" className="block text-center text-sm text-gray-500 hover:text-gray-900 mt-3">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
