import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { formatPrice } from '@/lib/pricing'
import AddToCartButton from '@/components/store/AddToCartButton'
import type { Product } from '@/types'

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('marketplace_products')
    .select('*, suppliers(id, name, shipping_rate), marketplace_categories(id, name, slug)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!product) notFound()

  const supplier = Array.isArray(product.suppliers) ? product.suppliers[0] : product.suppliers
  const category = Array.isArray(product.marketplace_categories) ? product.marketplace_categories[0] : product.marketplace_categories

  function normalizeUrl(url: string): string | null {
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (url.startsWith('www.')) return `https://${url}`
    return null
  }

  const images: string[] = (product.images ?? [])
    .map((u: string) => normalizeUrl(u))
    .filter((u: string | null): u is string => u !== null)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Images */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative mb-3">
            {images[0] ? (
              <Image src={images[0]} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.slice(1).map((img, i) => (
                <div key={i} className="w-20 h-20 shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
                  <Image src={img} alt={`${product.name} ${i + 2}`} fill className="object-cover" sizes="80px" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {category && (
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{category.name}</p>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>

          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-gray-900">{formatPrice(product.selling_price)}</span>
          </div>

          {/* Stock indicator */}
          {product.stock > 0 ? (
            <p className="text-sm text-green-600 mb-4">
              {product.stock < 10 ? `Only ${product.stock} left` : 'In stock'}
            </p>
          ) : (
            <p className="text-sm text-red-500 mb-4">Out of stock</p>
          )}

          {/* Shipping */}
          {supplier && (
            <p className="text-sm text-gray-500 mb-6">
              {Number(supplier.shipping_rate) === 0
                ? 'Free shipping'
                : `Shipping: ${formatPrice(Number(supplier.shipping_rate))}`}
            </p>
          )}

          {product.stock > 0 && (
            <AddToCartButton
              productId={product.id}
              supplierId={supplier?.id ?? ''}
              name={product.name}
              slug={product.slug}
              price={product.selling_price}
              image={images[0] ?? null}
            />
          )}

          {product.description && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Specifications</h3>
              <dl className="text-sm space-y-1">
                {Object.entries(product.attributes as Record<string, string>).map(([k, v]) => (
                  <div key={k} className="flex gap-4">
                    <dt className="text-gray-500 w-32 shrink-0">{k}</dt>
                    <dd className="text-gray-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
