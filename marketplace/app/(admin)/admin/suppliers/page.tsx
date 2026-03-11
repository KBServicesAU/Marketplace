import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Supplier } from '@/types'

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; active?: string }>
}) {
  const { type, active } = await searchParams
  const supabase = createServiceClient()

  let query = supabase.from('suppliers').select('*').order('name')
  if (type) query = query.eq('type', type)
  if (active === 'true') query = query.eq('is_active', true)
  else if (active === 'false') query = query.eq('is_active', false)

  const { data: suppliers } = await query

  const tabs: Array<{ label: string; href: string; active: boolean }> = [
    { label: 'All', href: '/admin/suppliers', active: !type && !active },
    { label: 'CSV', href: '/admin/suppliers?type=spreadsheet', active: type === 'spreadsheet' },
    { label: 'API', href: '/admin/suppliers?type=api', active: type === 'api' },
    { label: 'Active', href: '/admin/suppliers?active=true', active: active === 'true' },
    { label: 'Inactive', href: '/admin/suppliers?active=false', active: active === 'false' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <Link
          href="/admin/suppliers/new"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
        >
          + Add Supplier
        </Link>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <a
            key={t.href}
            href={t.href}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              t.active
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 text-sm text-gray-500">
          {suppliers?.length ?? 0} supplier{(suppliers?.length ?? 0) !== 1 ? 's' : ''}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Type</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Shipping Rate</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers?.map((s: Supplier) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">{s.name}</td>
                <td className="px-6 py-4">
                  <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs capitalize">
                    {s.type === 'spreadsheet' ? 'CSV' : s.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">${Number(s.shipping_rate).toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/admin/suppliers/${s.id}/edit`}
                    className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {(!suppliers || suppliers.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  No suppliers found.{' '}
                  {!type && !active && <Link href="/admin/suppliers/new" className="underline">Add your first supplier.</Link>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
