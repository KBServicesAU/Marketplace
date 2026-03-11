'use client'

import { useState } from 'react'
import Image from 'next/image'
import { calculateSellingPrice, formatPrice } from '@/lib/pricing'

type Category = { id: string; name: string; margin_percentage: number }

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

function normalizeUrl(url: string): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('www.')) return `https://${url}`
  return null
}

export default function ProductDetailPanel({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product
  categories: Category[]
  onClose: () => void
  onSaved: (updated: Product) => void
}) {
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description ?? '')
  const [categoryId, setCategoryId] = useState(product.category_id ?? '')
  const [costPrice, setCostPrice] = useState(String(product.cost_price))
  const [sellingPrice, setSellingPrice] = useState(String(product.selling_price))
  const [stock, setStock] = useState(String(product.stock))
  const [isActive, setIsActive] = useState(product.is_active)
  const [selectedImg, setSelectedImg] = useState(0)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const supplier = Array.isArray(product.suppliers) ? product.suppliers[0] : product.suppliers
  const images = (product.images ?? []).map(normalizeUrl).filter((u): u is string => u !== null)

  // Auto-recalculate selling price when category or cost changes
  function handleCategoryChange(id: string) {
    setCategoryId(id)
    const cat = categories.find((c) => c.id === id)
    if (cat && costPrice) {
      const newPrice = calculateSellingPrice(parseFloat(costPrice) || 0, cat.margin_percentage)
      setSellingPrice(String(newPrice))
    }
  }

  function handleCostChange(val: string) {
    setCostPrice(val)
    const cat = categories.find((c) => c.id === categoryId)
    if (cat && val) {
      const newPrice = calculateSellingPrice(parseFloat(val) || 0, cat.margin_percentage)
      setSellingPrice(String(newPrice))
    }
  }

  const margin = (() => {
    const cost = parseFloat(costPrice) || 0
    const sell = parseFloat(sellingPrice) || 0
    if (cost <= 0) return 0
    return Math.round(((sell - cost) / cost) * 100)
  })()

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          category_id: categoryId || null,
          cost_price: parseFloat(costPrice) || 0,
          selling_price: parseFloat(sellingPrice) || 0,
          stock: parseInt(stock) || 0,
          is_active: isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); setSaving(false); return }
      onSaved(data)
    } catch {
      setError('Network error')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' })
    if (res.ok) {
      onSaved({ ...product, id: '__deleted__' })
    } else {
      const d = await res.json()
      setError(d.error ?? 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight truncate max-w-sm">{product.name}</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {product.supplier_sku}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Image gallery */}
          {images.length > 0 && (
            <div>
              <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden relative mb-2">
                <Image
                  src={images[selectedImg] ?? images[0]}
                  alt={product.name}
                  fill
                  className="object-contain"
                  sizes="640px"
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImg(i)}
                      className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden relative border-2 transition ${selectedImg === i ? 'border-gray-900' : 'border-transparent'}`}
                    >
                      <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status + supplier */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Supplier: <span className="font-medium text-gray-900">{supplier?.name ?? '—'}</span></span>
            <label className="flex items-center gap-2 ml-auto cursor-pointer">
              <span className="text-gray-500">Active</span>
              <div
                onClick={() => setIsActive(!isActive)}
                className={`w-10 h-6 rounded-full transition relative cursor-pointer ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isActive ? 'left-5' : 'left-1'}`} />
              </div>
            </label>
          </div>

          {/* Core fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Product Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— No category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.margin_percentage}% margin)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Cost Price (ex GST)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => handleCostChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Selling Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Margin</label>
                <div className={`border rounded-lg px-3 py-2 text-sm font-medium ${margin >= 0 ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {margin}%
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Stock</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Attributes */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Specifications</h3>
              <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
                {Object.entries(product.attributes).map(([k, v]) => (
                  <div key={k} className="flex gap-4 px-3 py-2 text-sm">
                    <span className="text-gray-500 w-32 shrink-0 truncate">{k}</span>
                    <span className="text-gray-900 flex-1">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image URLs list */}
          {images.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Image URLs ({images.length})</h3>
              <div className="space-y-1">
                {images.map((img, i) => (
                  <p key={i} className="text-xs text-gray-500 font-mono truncate bg-gray-50 px-2 py-1 rounded">{img}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-200 px-6 py-4 shrink-0 flex items-center gap-3">
          {error && <p className="text-red-600 text-sm flex-1">{error}</p>}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50 ml-auto"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <a
            href={`/products/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-900 border border-gray-300 px-4 py-2 rounded-lg"
          >
            View on site ↗
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
