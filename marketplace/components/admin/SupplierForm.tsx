'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Supplier } from '@/types'

export default function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState(supplier?.name ?? '')
  const [type, setType] = useState<'spreadsheet' | 'api'>(supplier?.type ?? 'spreadsheet')
  const [shippingRate, setShippingRate] = useState(String(supplier?.shipping_rate ?? '0'))
  const [isActive, setIsActive] = useState(supplier?.is_active ?? true)

  // API config fields
  const apiConf = supplier?.api_config
  const [baseUrl, setBaseUrl] = useState(apiConf?.base_url ?? '')
  const [authType, setAuthType] = useState(apiConf?.auth_type ?? 'bearer')
  const [authValue, setAuthValue] = useState(apiConf?.auth_value ?? '')
  const [fieldMapJson, setFieldMapJson] = useState(
    apiConf?.field_map ? JSON.stringify(apiConf.field_map, null, 2) : ''
  )

  // CSV column map
  const [columnMapJson, setColumnMapJson] = useState(
    supplier?.column_map ? JSON.stringify(supplier.column_map, null, 2) : ''
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    let api_config = null
    if (type === 'api') {
      try {
        api_config = {
          base_url: baseUrl,
          auth_type: authType,
          auth_value: authValue,
          field_map: fieldMapJson ? JSON.parse(fieldMapJson) : {},
        }
      } catch {
        setError('API field map is not valid JSON')
        setLoading(false)
        return
      }
    }

    let column_map = null
    if (type === 'spreadsheet' && columnMapJson) {
      try {
        column_map = JSON.parse(columnMapJson)
      } catch {
        setError('Column map is not valid JSON')
        setLoading(false)
        return
      }
    }

    const payload = {
      name,
      type,
      shipping_rate: parseFloat(shippingRate) || 0,
      is_active: isActive,
      api_config,
      column_map,
    }

    const { error: dbError } = supplier
      ? await supabase.from('suppliers').update(payload).eq('id', supplier.id)
      : await supabase.from('suppliers').insert(payload)

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
    } else {
      router.push('/admin/suppliers')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl border border-gray-200 p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'spreadsheet' | 'api')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="spreadsheet">Spreadsheet / CSV</option>
            <option value="api">API</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Flat Shipping Rate (AUD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={shippingRate}
            onChange={(e) => setShippingRate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <label htmlFor="active" className="text-sm text-gray-700">Active (include products in store)</label>
      </div>

      {type === 'api' && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <h3 className="font-medium text-gray-900">API Configuration</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base URL (products endpoint)</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.supplier.com/v1/products"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auth Type</label>
              <select value={authType} onChange={(e) => setAuthType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="bearer">Bearer Token</option>
                <option value="api_key">API Key Header</option>
                <option value="basic">Basic Auth (user:pass)</option>
                <option value="none">No Auth</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auth Value</label>
              <input
                value={authValue}
                onChange={(e) => setAuthValue(e.target.value)}
                placeholder="token or user:password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Map (JSON) — maps their field names to ours
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Keys = their API field names, values = our field names (supplierSku, name, costPrice, description, stock, images, categoryHint)
            </p>
            <textarea
              value={fieldMapJson}
              onChange={(e) => setFieldMapJson(e.target.value)}
              rows={6}
              placeholder={'{
  "sku": "supplierSku",
  "title": "name",
  "wholesale_price": "costPrice"
}'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs"
            />
          </div>
        </div>
      )}

      {type === 'spreadsheet' && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <h3 className="font-medium text-gray-900">CSV Column Map</h3>
          <p className="text-xs text-gray-500">
            Map your CSV column headers to our fields (supplierSku, name, costPrice, description, stock, images, categoryHint).
            Images column can contain pipe-separated URLs: url1|url2
          </p>
          <textarea
            value={columnMapJson}
            onChange={(e) => setColumnMapJson(e.target.value)}
            rows={8}
            placeholder={'{
  "Product Code": "supplierSku",
  "Product Name": "name",
  "Cost Price": "costPrice",
  "Category": "categoryHint"
}'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs"
          />
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium text-sm"
        >
          {loading ? 'Saving…' : supplier ? 'Save Changes' : 'Create Supplier'}
        </button>
        <button type="button" onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
