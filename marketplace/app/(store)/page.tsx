import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProductCard from '@/components/store/ProductCard'
import type { Category, Product } from '@/types'

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: featured }] = await Promise.all([
    supabase
      .from('marketplace_categories')
      .select('id, name, slug')
      .order('name')
      .limit(8),
    supabase
      .from('marketplace_products')
      .select('id, name, slug, selling_price, images, supplier_id, suppliers(shipping_rate)')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">Shop Thousands of Products</h1>
          <p className="text-gray-400 text-lg mb-8">Curated from top suppliers, delivered to your door</p>
          <Link
            href="/products"
            className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition"
          >
            Shop All Products
          </Link>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map((c: Pick<Category, 'id' | 'name' | 'slug'>) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="bg-gray-50 hover:bg-gray-100 rounded-xl p-6 text-center transition group"
              >
                <p className="font-semibold text-gray-900 group-hover:text-gray-700">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featured && featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">New Arrivals</h2>
            <Link href="/products" className="text-sm text-gray-500 hover:text-gray-900 underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p as unknown as Product} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
