import { createServiceClient } from '@/lib/supabase/server'
import ProductsTable from '@/components/admin/ProductsTable'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; supplier?: string; category?: string; active?: string; page?: string }>
}) {
  const { q, supplier, category, active, page: pageStr } = await searchParams
  const supabase = createServiceClient()
  const PAGE_SIZE = 50
  const page = parseInt(pageStr ?? '1') || 1
  const from = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('marketplace_products')
    .select(
      'id, name, supplier_sku, slug, description, cost_price, selling_price, stock, is_active, images, attributes, category_id, supplier_id, suppliers(id, name), marketplace_categories(id, name, margin_percentage)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (q) query = query.ilike('name', `%${q}%`)
  if (supplier) query = query.eq('supplier_id', supplier)
  if (category === 'none') query = query.is('category_id', null)
  else if (category) query = query.eq('category_id', category)
  if (active === 'true') query = query.eq('is_active', true)
  else if (active === 'false') query = query.eq('is_active', false)

  const [{ data: products, count }, { data: suppliers }, { data: categories }] = await Promise.all([
    query,
    supabase.from('suppliers').select('id, name').order('name'),
    supabase.from('marketplace_categories').select('id, name, margin_percentage').order('name'),
  ])

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Resolve heading for filtered views
  let heading = 'Products'
  if (category === 'none') heading = 'Uncategorized Products'
  else if (category) {
    const cat = categories?.find((c) => c.id === category)
    if (cat) heading = `${cat.name} — Products`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
          {(category || supplier || active) && (
            <a href="/admin/products" className="text-xs text-gray-400 hover:text-gray-700 mt-1 inline-block">
              ← Clear all filters
            </a>
          )}
        </div>
        <p className="text-sm text-gray-400">
          Selling price = cost × (1 + margin%). Default 30% when no category set.
        </p>
      </div>
      <ProductsTable
        products={(products ?? []) as Parameters<typeof ProductsTable>[0]['products']}
        categories={categories ?? []}
        suppliers={suppliers ?? []}
        totalCount={count ?? 0}
        page={page}
        totalPages={totalPages}
        q={q}
        supplierId={supplier}
        categoryId={category}
        activeFilter={active}
      />
    </div>
  )
}
