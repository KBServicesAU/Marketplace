import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/pricing'

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  paid:       'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped:    'bg-indigo-100 text-indigo-800',
  delivered:  'bg-green-100 text-green-800',
  cancelled:  'bg-red-100 text-red-800',
  refunded:   'bg-gray-100 text-gray-600',
}

export default async function AccountOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/account/orders')

  const { data: orders } = await supabase
    .from('marketplace_orders')
    .select(`
      id, status, total, subtotal, shipping_total, created_at,
      marketplace_order_items(product_name, quantity, unit_price)
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/account" className="text-sm text-gray-400 hover:text-gray-700">← Account</Link>
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
      </div>

      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const items = Array.isArray(order.marketplace_order_items)
              ? order.marketplace_order_items
              : []
            return (
              <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-mono text-xs text-gray-400 mb-0.5">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize mb-1 ${
                      STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'
                    }`}>
                      {order.status}
                    </span>
                    <p className="font-bold text-gray-900">{formatPrice(Number(order.total))}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  {items.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate max-w-[220px]">{item.product_name}</span>
                      <span className="text-gray-400 ml-2 shrink-0">
                        × {item.quantity} · {formatPrice(Number(item.unit_price))}
                      </span>
                    </div>
                  ))}
                  {items.length > 4 && (
                    <p className="text-xs text-gray-400">+{items.length - 4} more items</p>
                  )}
                </div>

                <div className="flex justify-between text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                  <span>Subtotal: {formatPrice(Number(order.subtotal))}</span>
                  <span>Shipping: {formatPrice(Number(order.shipping_total))}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-lg font-medium text-gray-900 mb-2">No orders yet</p>
          <p className="text-gray-400 text-sm mb-6">When you place an order it will appear here.</p>
          <Link
            href="/products"
            className="bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-700 transition"
          >
            Start shopping
          </Link>
        </div>
      )}
    </div>
  )
}
