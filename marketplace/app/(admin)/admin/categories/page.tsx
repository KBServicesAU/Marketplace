import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = createServiceClient()

  const [{ data: categories }, { count: uncategorizedCount }] = await Promise.all([
    supabase
      .from('marketplace_categories')
      .select('id, name, slug, margin_percentage, marketplace_products(count)')
      .order('name'),
    supabase
      .from('marketplace_products')
      .select('*', { count: 'exact', head: true })
      .is('category_id', null),
  ])

  // Apply name search filter client-side (simple, no extra query needed)
  const filtered = q
    ? categories?.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    : categories

  function productCount(c: { marketplace_products: unknown }): number {
    const mp = c.marketplace_products
    if (Array.isArray(mp) && mp.length > 0 && typeof mp[0] === 'object' && mp[0] !== null && 'count' in mp[0]) {
      return Number((mp[0] as { count: number }).count)
    }
    return 0
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <Link
          href="/admin/categories/new"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
        >
          + Add Category
        </Link>
      </div>

      {/* Search */}
      <form className="flex gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search categories…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">Search</button>
        {q && (
          <a href="/admin/categories" className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50">
            Clear
          </a>
        )}
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 text-sm text-gray-500">
          {(filtered?.length ?? 0) + 1} categories
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Slug</th>
              <th className="text-right px-6 py-3 text-gray-500 font-medium">Margin</th>
              <th className="text-right px-6 py-3 text-gray-500 font-medium">Products</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* "No Category" virtual row — always first */}
            {!q && (
              <tr className="bg-orange-50 hover:bg-orange-100 transition-colors">
                <td className="px-6 py-4 font-medium text-orange-700">
                  <Link href="/admin/products?category=none" className="hover:underline flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                    No Category
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-400 text-xs font-mono">—</td>
                <td className="px-6 py-4 text-right text-gray-400">—</td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href="/admin/products?category=none"
                    className="inline-block bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-semibold hover:bg-orange-200 transition-colors"
                  >
                    {(uncategorizedCount ?? 0).toLocaleString()}
                  </Link>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href="/admin/products?category=none" className="text-xs text-orange-600 hover:underline">
                    View products →
                  </Link>
                </td>
              </tr>
            )}

            {filtered?.map((c) => {
              const count = productCount(c)
              return (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium">
                    <Link href={`/admin/products?category=${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{c.slug}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-green-700">{c.margin_percentage}%</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/products?category=${c.id}`}
                      className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold hover:bg-gray-200 transition-colors"
                    >
                      {count.toLocaleString()}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                    <Link href={`/admin/products?category=${c.id}`} className="text-xs text-gray-400 hover:text-gray-700 hover:underline">
                      View products →
                    </Link>
                    <Link href={`/admin/categories/${c.id}/edit`} className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition">
                      Edit
                    </Link>
                  </td>
                </tr>
              )
            })}

            {(!filtered || filtered.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  {q ? `No categories matching "${q}".` : 'No categories yet.'}{' '}
                  {!q && <Link href="/admin/categories/new" className="underline">Add your first category.</Link>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
