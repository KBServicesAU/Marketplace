import { createServiceClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = createServiceClient()

  const [
    { count: productCount },
    { count: orderCount },
    { count: supplierCount },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('marketplace_products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('marketplace_orders').select('*', { count: 'exact', head: true }),
    supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('marketplace_orders')
      .select('id, status, total, created_at, guest_email, marketplace_customers(email)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: 'Active Products', value: productCount?.toLocaleString() ?? '—' },
    { label: 'Total Orders', value: orderCount?.toLocaleString() ?? '—' },
    { label: 'Active Suppliers', value: supplierCount?.toLocaleString() ?? '—' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-3 gap-6 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
        {recentOrders && recentOrders.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Order ID</th>
                <th className="text-left py-2 text-gray-500 font-medium">Customer</th>
                <th className="text-left py-2 text-gray-500 font-medium">Total</th>
                <th className="text-left py-2 text-gray-500 font-medium">Status</th>
                <th className="text-left py-2 text-gray-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => {
                const customer = Array.isArray(o.marketplace_customers)
                  ? o.marketplace_customers[0]
                  : o.marketplace_customers
                return (
                  <tr key={o.id} className="border-b border-gray-50">
                    <td className="py-2 font-mono text-xs text-gray-600">{o.id.slice(0, 8)}…</td>
                    <td className="py-2">{customer?.email ?? o.guest_email ?? 'Guest'}</td>
                    <td className="py-2">${Number(o.total).toFixed(2)}</td>
                    <td className="py-2">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-2 text-gray-500">
                      {new Date(o.created_at).toLocaleDateString('en-AU')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-sm">No orders yet.</p>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}
