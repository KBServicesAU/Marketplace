import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; supplier?: string; page?: string }>
}) {
  const { q, supplier, page: pageStr } = await searchParams
  const supabase = createServiceClient()
  const PAGE_SIZE = 50
  const page = parseInt(pageStr ?? '1') || 1
  const from = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('marketplace_products')
    .select('id, name, supplier_sku, selling_price, cost_price, stock, is_active, suppliers(name), marketplace_categories(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (q) query = query.ilike('name', `%${q}%`)
  if (supplier) query = query.eq('supplier_id', supplier)

  const { data: products, count } = await query
  const { data: suppliers } = await supabase.from('suppliers').select('id, name').order('name')

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Products</h1>

      <form className="flex gap-3 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <select name="supplier" defaultValue={supplier} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All suppliers</option>
          {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">Search</button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 text-sm text-gray-500">
          {count?.toLocaleString()} products
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">SKU</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Supplier</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Category</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Cost</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Price</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Stock</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products?.map((p) => {
              const supplier = Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers
              const category = Array.isArray(p.marketplace_categories) ? p.marketplace_categories[0] : p.marketplace_categories
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.supplier_sku}</td>
                  <td className="px-4 py-3 text-gray-600">{supplier?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{category?.name ?? '—'}</td>
                  <td className="px-4 py-3">${Number(p.cost_price).toFixed(2)}</td>
                  <td className="px-4 py-3 font-medium">${Number(p.selling_price).toFixed(2)}</td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3">
                    <span className={`w-2 h-2 inline-block rounded-full ${p.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`?q=${q ?? ''}&supplier=${supplier ?? ''}&page=${page - 1}`}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Prev</Link>
              )}
              {page < totalPages && (
                <Link href={`?q=${q ?? ''}&supplier=${supplier ?? ''}&page=${page + 1}`}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
