import { createServiceClient } from '@/lib/supabase/server'
import OrderStatusSelect from '@/components/admin/OrderStatusSelect'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const { status, q, page: pageStr } = await searchParams
  const supabase = createServiceClient()
  const PAGE_SIZE = 30
  const page = parseInt(pageStr ?? '1') || 1
  const from = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('marketplace_orders')
    .select(
      'id, status, total, shipping_total, subtotal, created_at, guest_email, stripe_payment_intent_id, marketplace_customers(email, first_name, last_name)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (status) query = query.eq('status', status)
  if (q) query = query.or(`guest_email.ilike.%${q}%`)

  const { data: orders, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <span className="text-sm text-gray-400">{(count ?? 0).toLocaleString()} order{(count ?? 0) !== 1 ? 's' : ''}</span>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <a href={`/admin/orders${q ? `?q=${q}` : ''}`}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border ${!status ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:border-gray-900'}`}>
          All
        </a>
        {statuses.map((s) => (
          <a key={s} href={`/admin/orders?status=${s}${q ? `&q=${q}` : ''}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border capitalize ${status === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:border-gray-900'}`}>
            {s}
          </a>
        ))}
      </div>

      {/* Customer search */}
      <form className="flex gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by email…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        {status && <input type="hidden" name="status" value={status} />}
        <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shrink-0">Search</button>
        {q && (
          <a href={`/admin/orders${status ? `?status=${status}` : ''}`}
            className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">
            Clear
          </a>
        )}
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Order ID</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Customer</th>
              <th className="text-right px-6 py-3 text-gray-500 font-medium">Subtotal</th>
              <th className="text-right px-6 py-3 text-gray-500 font-medium">Shipping</th>
              <th className="text-right px-6 py-3 text-gray-500 font-medium">Total</th>
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
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{o.id.slice(0, 8)}…</td>
                  <td className="px-6 py-4">
                    {name && <div className="font-medium text-sm">{name}</div>}
                    <div className="text-gray-500 text-xs">{email}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">${Number(o.subtotal).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-gray-600">${Number(o.shipping_total).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-semibold">${Number(o.total).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <OrderStatusSelect orderId={o.id} currentStatus={o.status} />
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(o.created_at).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              )
            })}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  {q ? `No orders matching "${q}".` : 'No orders yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`?status=${status ?? ''}&q=${q ?? ''}&page=${page - 1}`}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">← Prev</a>
              )}
              {page < totalPages && (
                <a href={`?status=${status ?? ''}&q=${q ?? ''}&page=${page + 1}`}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next →</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
