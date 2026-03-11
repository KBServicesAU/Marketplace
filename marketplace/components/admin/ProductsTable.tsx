'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProductDetailPanel from './ProductDetailPanel'

type Category = { id: string; name: string; margin_percentage: number }
type Supplier = { id: string; name: string }

type Product = {
  id: string
  name: string
  supplier_sku: string
  description: string | null
  cost_price: number
  selling_price: number
  stock: number
  is_active: boolean
  images: string[]
  attributes: Record<string, string> | null
  category_id: string | null
  supplier_id: string | null
  slug: string
  suppliers?: { id: string; name: string } | null
  marketplace_categories?: { id: string; name: string; margin_percentage: number } | null
}

export default function ProductsTable({
  products: initialProducts,
  categories,
  suppliers,
  totalCount,
  page,
  totalPages,
  q,
  supplierId,
}: {
  products: Product[]
  categories: Category[]
  suppliers: Supplier[]
  totalCount: number
  page: number
  totalPages: number
  q?: string
  supplierId?: string
}) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [selected, setSelected] = useState<Product | null>(null)
  const [categorizing, setCategorizing] = useState(false)
  const [catResult, setCatResult] = useState('')

  function getSupplier(p: Product) {
    return Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers
  }
  function getCategory(p: Product) {
    return Array.isArray(p.marketplace_categories) ? p.marketplace_categories[0] : p.marketplace_categories
  }

  function margin(p: Product) {
    const cost = Number(p.cost_price)
    const sell = Number(p.selling_price)
    if (!cost) return 0
    return Math.round(((sell - cost) / cost) * 100)
  }

  function onSaved(updated: Product) {
    if (updated.id === '__deleted__') {
      setProducts((prev) => prev.filter((p) => p.id !== selected?.id))
    } else {
      setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    }
    setSelected(null)
    router.refresh()
  }

  async function handleAiCategorize() {
    setCategorizing(true)
    setCatResult('')
    try {
      const res = await fetch('/api/admin/categorize', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setCatResult(data.message)
        router.refresh()
      } else {
        setCatResult(`Error: ${data.error}`)
      }
    } catch {
      setCatResult('Network error')
    } finally {
      setCategorizing(false)
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form className="flex gap-2 flex-1 min-w-0">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search products…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-0"
          />
          <select name="supplier" defaultValue={supplierId} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shrink-0">Search</button>
        </form>
        <button
          onClick={handleAiCategorize}
          disabled={categorizing}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347-.449.448A13.987 13.987 0 0012 21a13.987 13.987 0 00-4.242-.586l-.449-.448-.347-.347z" />
          </svg>
          {categorizing ? 'AI Categorizing…' : 'AI Auto-categorize'}
        </button>
      </div>

      {catResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${catResult.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {catResult}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 text-sm text-gray-500">
          {totalCount.toLocaleString()} products
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-12"></th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">SKU</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Supplier</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Category</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Cost</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Price</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Margin</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Stock</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => {
                const sup = getSupplier(p)
                const cat = getCategory(p)
                const m = margin(p)
                const thumb = (() => {
                  const img = p.images?.[0]
                  if (!img) return null
                  if (img.startsWith('http://') || img.startsWith('https://')) return img
                  if (img.startsWith('www.')) return `https://${img}`
                  return null
                })()
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="w-10 h-10 object-cover rounded-lg bg-gray-100" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 font-medium max-w-xs">
                      <p className="truncate">{p.name}</p>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500 whitespace-nowrap">{p.supplier_sku}</td>
                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{sup?.name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {cat ? (
                        <span className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{cat.name}</span>
                      ) : (
                        <span className="text-orange-500 text-xs">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">${Number(p.cost_price).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-medium">${Number(p.selling_price).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`text-xs font-medium ${m >= 20 ? 'text-green-600' : m >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {m}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={p.stock === 0 ? 'text-red-500' : 'text-gray-900'}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`w-2 h-2 inline-block rounded-full ${p.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setSelected(p)}
                        className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition whitespace-nowrap"
                      >
                        View / Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-gray-400">No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`?q=${q ?? ''}&supplier=${supplierId ?? ''}&page=${page - 1}`}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">← Prev</a>
              )}
              {page < totalPages && (
                <a href={`?q=${q ?? ''}&supplier=${supplierId ?? ''}&page=${page + 1}`}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next →</a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <ProductDetailPanel
          product={selected}
          categories={categories}
          onClose={() => setSelected(null)}
          onSaved={onSaved}
        />
      )}
    </>
  )
}
