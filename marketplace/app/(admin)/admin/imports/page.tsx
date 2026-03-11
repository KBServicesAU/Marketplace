import { createServiceClient } from '@/lib/supabase/server'
import ImportTrigger from '@/components/admin/ImportTrigger'
import type { ImportJob, Supplier } from '@/types'

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string; status?: string }>
}) {
  const { supplier: supplierFilter, status: statusFilter } = await searchParams
  const supabase = createServiceClient()

  let jobsQuery = supabase
    .from('import_jobs')
    .select('*, suppliers(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (supplierFilter) jobsQuery = jobsQuery.eq('supplier_id', supplierFilter)
  if (statusFilter) jobsQuery = jobsQuery.eq('status', statusFilter)

  const [{ data: jobs }, { data: suppliers }] = await Promise.all([
    jobsQuery,
    supabase.from('suppliers').select('id, name, type, column_map').eq('is_active', true).order('name'),
  ])

  const { data: allSuppliers } = await supabase.from('suppliers').select('id, name').order('name')

  const importStatuses = ['pending', 'running', 'completed', 'failed']

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Product Imports</h1>

      <ImportTrigger suppliers={suppliers ?? []} />

      <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-semibold text-gray-900">Import History</h2>
          {/* Filters */}
          <form className="flex gap-2 flex-wrap">
            <select name="supplier" defaultValue={supplierFilter} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="">All suppliers</option>
              {allSuppliers?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select name="status" defaultValue={statusFilter} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="">All statuses</option>
              {importStatuses.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
            <button type="submit" className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm">Filter</button>
            {(supplierFilter || statusFilter) && (
              <a href="/admin/imports" className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">
                Clear
              </a>
            )}
          </form>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Supplier</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Type</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-right px-6 py-3 text-gray-500 font-medium">Imported</th>
              <th className="text-right px-6 py-3 text-gray-500 font-medium">Updated</th>
              <th className="text-right px-6 py-3 text-gray-500 font-medium">Failed</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs?.map((j: ImportJob & { suppliers: { name: string } | null }) => (
              <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">{j.suppliers?.name ?? '—'}</td>
                <td className="px-6 py-4 uppercase text-xs font-mono">{j.type}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    j.status === 'completed' ? 'bg-green-100 text-green-800' :
                    j.status === 'failed' ? 'bg-red-100 text-red-800' :
                    j.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>{j.status}</span>
                </td>
                <td className="px-6 py-4 text-right text-green-700 font-medium">{j.products_imported}</td>
                <td className="px-6 py-4 text-right text-blue-700">{j.products_updated}</td>
                <td className="px-6 py-4 text-right text-red-600">{j.products_failed}</td>
                <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(j.created_at).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
              </tr>
            ))}
            {(!jobs || jobs.length === 0) && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">No imports found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
