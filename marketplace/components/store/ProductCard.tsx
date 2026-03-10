import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/pricing'
import type { Product } from '@/types'

export default function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0] ?? null

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-3 relative">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition duration-300"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.name}</p>
      <p className="text-sm font-bold text-gray-900">{formatPrice(product.selling_price)}</p>
    </Link>
  )
}
