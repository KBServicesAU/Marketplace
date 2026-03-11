'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Category } from '@/types'

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function CategoryForm({ category }: { category?: Category }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState(category?.name ?? '')
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [margin, setMargin] = useState(String(category?.margin_percentage ?? '30'))

  function handleNameChange(n: string) {
    setName(n)
    if (!category) setSlug(toSlug(n))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const payload = { name, slug, margin_percentage: parseFloat(margin) }
    try {
      const url = category ? `/api/admin/categories/${category.id}` : '/api/admin/categories'
      const method = category ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save category')
        setLoading(false)
      } else {
        router.push('/admin/categories')
        router.refresh()
      }
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-gray-200 p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
        <input value={name} onChange={(e) => handleNameChange(e.target.value)} required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL path)</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Margin Percentage (%)</label>
        <p className="text-xs text-gray-500 mb-1">
          Selling price = cost × (1 + margin/100). Applied to all products in this category during import.
        </p>
        <input type="number" min="0" max="1000" step="0.1" value={margin}
          onChange={(e) => setMargin(e.target.value)} required
          className="w-full border border-gray-300 rounded-lg px-3 py-2" />
      </div>
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium text-sm">
          {loading ? 'Saving…' : category ? 'Save Changes' : 'Create Category'}
        </button>
        <button type="button" onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 text-sm">Cancel</button>
      </div>
    </form>
  )
}
