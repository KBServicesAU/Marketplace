import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/store/LogoutButton'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/account')

  const { data: customer } = await supabase
    .from('marketplace_customers')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const { count: orderCount } = await supabase
    .from('marketplace_orders')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', user.id)

  const displayName = customer?.first_name
    ? `${customer.first_name}${customer.last_name ? ' ' + customer.last_name : ''}`
    : user.email

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">My Account</h1>
      <p className="text-gray-500 text-sm mb-8">{displayName}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link
          href="/account/orders"
          className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-900 transition-colors"
        >
          <div className="text-3xl font-bold text-gray-900 mb-1">{orderCount ?? 0}</div>
          <div className="text-sm text-gray-500 group-hover:text-gray-700">Orders</div>
        </Link>

        <Link
          href="/account/addresses"
          className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-900 transition-colors"
        >
          <div className="text-2xl mb-1">📍</div>
          <div className="font-medium text-gray-900 text-sm">Saved Addresses</div>
          <div className="text-xs text-gray-400 mt-0.5">Manage delivery addresses</div>
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">Account details</h2>
        <p className="text-sm text-gray-600">{user.email}</p>
        {customer?.first_name && (
          <p className="text-sm text-gray-600 mt-0.5">{customer.first_name} {customer.last_name}</p>
        )}
      </div>

      <LogoutButton />
    </div>
  )
}
