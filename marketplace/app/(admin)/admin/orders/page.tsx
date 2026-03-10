import { createServiceClient } from '@/lib/supabase/server'
import OrderStatusSelect from '@/components/admin/OrderStatusSelect'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page: pageStr } = await searchParams
  const supabase = createServiceClient()
  const PAGE_SIZE = 30
  const page = parseInt(pageStr ?? '1') || 1
  const from = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('marketplace_orders')
    .select('id, status, total, shipping_total, subtotal, created_at, guest_email, marketplace_customers(email, first_name, last_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (status) query = query.eq('status', status)

  const { data: orders, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        <a href="/admin/orders" className={`px-3 py-1.5 rounded-full text-sm font-medium border ${!status ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:border-gray-900'}`}>
          All ({count})
        </a>
        {statuses.map((s) => (
          <a key={s} href={`/admin/orders?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border capitalize ${status === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:border-gray-900'}`}>
            {s}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Order</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Customer</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Total</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders?.map((o) => {
              const customer = Array.isArray(o.marketplace_customers) ? o.marketplace_customers[0] : o.marketplace_customers
              const email = customer?.email ?? o.guest_email ?? 'Guest'
              const name = customer?.first_name ? `${customer.first_name} ${customer.last_name ?? ''}`.trim() : null
              return (
                <tr key={o.id}>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{o.id.slice(0, 8)}…</td>
                  <td className="px-6 py-4">
                    {name && <div className="font-medium">{name}</div>}
                    <div className="text-gray-500 text-xs">{email}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">${Number(o.total).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <OrderStatusSelect orderId={o.id} currentStatus={o.status} />
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(o.created_at).toLocaleDateString('en-AU')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
