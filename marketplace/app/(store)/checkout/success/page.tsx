import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/pricing'

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; payment_intent?: string }>
}) {
  const { order: orderId } = await searchParams

  // Clear the cart cookie
  const cookieStore = await cookies()
  cookieStore.set('marketplace_cart', '', { maxAge: 0, path: '/' })

  let order = null
  if (orderId) {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('marketplace_orders')
      .select('id, total, status, created_at, marketplace_order_items(product_name, quantity)')
      .eq('id', orderId)
      .single()
    order = data
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      {/* Success icon */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Order confirmed!</h1>
      <p className="text-gray-500 mb-8">
        Thanks for your purchase. You'll receive a confirmation email shortly.
      </p>

      {order && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-500">Order ID</span>
            <span className="font-mono text-xs text-gray-600">#{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          {Array.isArray(order.marketplace_order_items) &&
            order.marketplace_order_items.slice(0, 4).map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                <span className="text-gray-700 truncate max-w-[240px]">{item.product_name}</span>
                <span className="text-gray-500 ml-2">× {item.quantity}</span>
              </div>
            ))}
          <div className="flex justify-between font-bold text-gray-900 mt-3 pt-3 border-t border-gray-200">
            <span>Total paid</span>
            <span>{formatPrice(Number(order.total))}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/account/orders"
          className="bg-gray-900 text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-700 transition"
        >
          View my orders
        </Link>
        <Link
          href="/products"
          className="border border-gray-300 text-gray-700 px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
