import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/store/ProductCard'
import Link from 'next/link'
import type { Category, Product } from '@/types'

const PAGE_SIZE = 32

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; supplier?: string }>
}) {
  const { q, category, page: pageStr } = await searchParams
  const supabase = await createClient()
  const page = parseInt(pageStr ?? '1') || 1
  const from = (page - 1) * PAGE_SIZE

  // Build query
  let query = supabase
    .from('marketplace_products')
    .select(
      'id, name, slug, selling_price, images, supplier_id, suppliers(shipping_rate, name), marketplace_categories(name, slug)',
      { count: 'exact' }
    )
    .eq('is_active', true)
    .order('name')
    .range(from, from + PAGE_SIZE - 1)

  if (q) {
    query = query.textSearch('name', q, { type: 'websearch', config: 'english' })
  }

  if (category) {
    const { data: cat } = await supabase
      .from('marketplace_categories')
      .select('id')
      .eq('slug', category)
      .single()
    if (cat) query = query.eq('category_id', cat.id)
  }

  const { data: products, count } = await query
  const { data: categories } = await supabase
    .from('marketplace_categories')
    .select('id, name, slug')
    .order('name')

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className="w-56 shrink-0">
          <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
          <ul className="space-y-1">
            <li>
              <Link
                href={q ? `/products?q=${q}` : '/products'}
                className={`block px-3 py-1.5 rounded-lg text-sm transition ${
                  !category ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All Products
              </Link>
            </li>
            {categories?.map((c: Pick<Category, 'id' | 'name' | 'slug'>) => (
              <li key={c.id}>
                <Link
                  href={`/products?category=${c.slug}${q ? `&q=${q}` : ''}`}
                  className={`block px-3 py-1.5 rounded-lg text-sm transition ${
                    category === c.slug ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              {q && (
                <p className="text-sm text-gray-500 mb-1">
                  Results for <span className="font-medium text-gray-900">"{q}"</span>
                </p>
              )}
              <p className="text-sm text-gray-500">{(count ?? 0).toLocaleString()} products</p>
            </div>
          </div>

          {products && products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p as unknown as Product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm mt-1">Try a different search or category</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {page > 1 && (
                <Link
                  href={`/products?${new URLSearchParams({ ...(q && { q }), ...(category && { category }), page: String(page - 1) })}`}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link
                  href={`/products?${new URLSearchParams({ ...(q && { q }), ...(category && { category }), page: String(page + 1) })}`}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
