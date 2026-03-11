import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AccountAddressesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/account/addresses')

  const { data: addresses } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('is_default', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/account" className="text-sm text-gray-400 hover:text-gray-700">← Account</Link>
        <h1 className="text-2xl font-bold text-gray-900">Saved Addresses</h1>
      </div>

      {addresses && addresses.length > 0 ? (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {addr.label && (
                    <span className="font-medium text-gray-900 text-sm">{addr.label}</span>
                  )}
                  {addr.is_default && (
                    <span className="bg-gray-900 text-white text-xs px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {addr.address_line1}
                {addr.address_line2 ? `, ${addr.address_line2}` : ''}
              </p>
              <p className="text-sm text-gray-600">
                {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postcode}
              </p>
              <p className="text-sm text-gray-500">{addr.country}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
          <div className="text-4xl mb-3">📍</div>
          <p className="text-gray-500 text-sm">No saved addresses yet.</p>
          <p className="text-gray-400 text-xs mt-1">
            Addresses are saved automatically when you complete an order.
          </p>
        </div>
      )}
    </div>
  )
}
