'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Supplier } from '@/types'

// ---------------------------------------------------------------------------
// Presets for your known suppliers — click to auto-fill the form
// ---------------------------------------------------------------------------
const PRESETS = [
  {
    label: 'Dynamic Supplies (CSV)',
    type: 'spreadsheet' as const,
    columnMap: {
      'Dynamic Supplies SKU': 'supplierSku',
      'Name': 'name',
      'Reseller Price Ex GST': 'costPrice',
      'Description': 'description',
      'VIRTUAL': 'stock',
      'Main Image URL': 'images',
      'Alt Image 1': 'images2',
      'Alt Image 2': 'images3',
      'Cat Tier 1': 'categoryHint',
      'Brand': 'brand',
    },
  },
  {
    label: 'PRODFEED Supplier (CSV)',
    type: 'spreadsheet' as const,
    columnMap: {
      'Stockcode': 'supplierSku',
      'Description': 'name',
      'Buy': 'costPrice',
      'Stock Level': 'stock',
      'Image URL': 'images',
      'Brand': 'brand',
      'Core Product': 'categoryHint',
    },
  },
  {
    label: 'Ingram Micro (API)',
    type: 'api' as const,
    baseUrl: 'https://api.ingrammicro.com:443/resellers/v6/catalog',
    authType: 'oauth2',
    authValue: 'YOUR_CLIENT_ID:YOUR_CLIENT_SECRET',
    tokenUrl: 'https://api.ingrammicro.com:443/oauth/oauth30/token',
    pagination: {
      type: 'page',
      page_param: 'pageNumber',
      size_param: 'pageSize',
      page_size: 100,
      data_field: 'catalog',
    },
    fieldMap: {
      'ingramPartNumber': 'supplierSku',
      'description': 'name',
      'price': 'costPrice',
      'inventoryQuantity': 'stock',
      'productCategory': 'categoryHint',
    },
  },
]

export default function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const router = useRouter()
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
  const [tokenUrl, setTokenUrl] = useState(apiConf?.token_url ?? '')
  const [fieldMapJson, setFieldMapJson] = useState(
    apiConf?.field_map ? JSON.stringify(apiConf.field_map, null, 2) : ''
  )
  const [paginationJson, setPaginationJson] = useState(
    apiConf?.pagination ? JSON.stringify(apiConf.pagination, null, 2) : ''
  )

  // CSV column map
  const [columnMapJson, setColumnMapJson] = useState(
    supplier?.column_map ? JSON.stringify(supplier.column_map, null, 2) : ''
  )

  function applyPreset(preset: typeof PRESETS[number]) {
    setType(preset.type)
    if (preset.type === 'spreadsheet') {
      setColumnMapJson(JSON.stringify(preset.columnMap, null, 2))
      setBaseUrl('')
      setAuthType('bearer')
      setAuthValue('')
      setTokenUrl('')
      setFieldMapJson('')
      setPaginationJson('')
    } else {
      setBaseUrl(preset.baseUrl ?? '')
      setAuthType(preset.authType ?? 'bearer')
      setAuthValue(preset.authValue ?? '')
      setTokenUrl(preset.tokenUrl ?? '')
      setFieldMapJson(JSON.stringify(preset.fieldMap ?? {}, null, 2))
      setPaginationJson(JSON.stringify(preset.pagination ?? {}, null, 2))
      setColumnMapJson('')
    }
  }

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
          ...(authType === 'oauth2' && tokenUrl ? { token_url: tokenUrl } : {}),
          field_map: fieldMapJson ? JSON.parse(fieldMapJson) : {},
          pagination: paginationJson ? JSON.parse(paginationJson) : undefined,
        }
      } catch {
        setError('API config contains invalid JSON — check Field Map and Pagination fields')
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

    try {
      const url = supplier ? `/api/admin/suppliers/${supplier.id}` : '/api/admin/suppliers'
      const method = supplier ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save supplier')
        setLoading(false)
      } else {
        router.push('/admin/suppliers')
        router.refresh()
      }
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl border border-gray-200 p-6">

      {/* Quick-setup presets */}
      {!supplier && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">Quick setup — choose a supplier template:</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-xs bg-white border border-blue-300 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Dynamic Supplies"
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

      {/* API config */}
      {type === 'api' && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <h3 className="font-medium text-gray-900">API Configuration</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Products Endpoint URL</label>
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
                <option value="oauth2">OAuth 2.0 (Client Credentials)</option>
                <option value="api_key">API Key Header</option>
                <option value="basic">Basic Auth (user:pass)</option>
                <option value="none">No Auth</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {authType === 'oauth2' ? 'Client ID:Client Secret' : 'Auth Value'}
              </label>
              <input
                value={authValue}
                onChange={(e) => setAuthValue(e.target.value)}
                placeholder={authType === 'oauth2' ? 'client_id:client_secret' : 'token or user:password'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          {authType === 'oauth2' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OAuth2 Token URL</label>
              <input
                value={tokenUrl}
                onChange={(e) => setTokenUrl(e.target.value)}
                placeholder="https://api.supplier.com/oauth/token"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Map (JSON)</label>
            <p className="text-xs text-gray-500 mb-1">
              Map their API field names → our fields: <code className="bg-gray-100 px-1 rounded">supplierSku, name, costPrice, description, stock, images, categoryHint</code>
            </p>
            <textarea
              value={fieldMapJson}
              onChange={(e) => setFieldMapJson(e.target.value)}
              rows={7}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pagination Config (JSON)</label>
            <p className="text-xs text-gray-500 mb-1">
              <code className="bg-gray-100 px-1 rounded">type</code>: &quot;page&quot; | &quot;cursor&quot; | &quot;offset&quot; — plus <code className="bg-gray-100 px-1 rounded">page_param, size_param, page_size, data_field</code>
            </p>
            <textarea
              value={paginationJson}
              onChange={(e) => setPaginationJson(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs"
            />
          </div>
        </div>
      )}

      {/* CSV column map */}
      {type === 'spreadsheet' && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <h3 className="font-medium text-gray-900">CSV Column Map</h3>
          <p className="text-xs text-gray-500">
            Map your CSV column headers → our fields: <code className="bg-gray-100 px-1 rounded">supplierSku, name, costPrice, description, stock, images, categoryHint</code>.
            Multiple image columns: list each as <code className="bg-gray-100 px-1 rounded">&quot;Col Name&quot;: &quot;images&quot;</code>.
          </p>
          <textarea
            value={columnMapJson}
            onChange={(e) => setColumnMapJson(e.target.value)}
            rows={10}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs"
          />
        </div>
      )}

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

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
