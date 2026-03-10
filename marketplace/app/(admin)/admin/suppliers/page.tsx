import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Supplier } from '@/types'

export default async function SuppliersPage() {
  const supabase = createServiceClient()
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <Link
          href="/admin/suppliers/new"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
        >
          + Add Supplier
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
              <tr key={s.id}>
                <td className="px-6 py-4 font-medium">{s.name}</td>
                <td className="px-6 py-4">
                  <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs capitalize">
                    {s.type}
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
                    className="text-gray-500 hover:text-gray-900 text-xs underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {(!suppliers || suppliers.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  No suppliers yet. <Link href="/admin/suppliers/new" className="underline">Add your first supplier.</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
