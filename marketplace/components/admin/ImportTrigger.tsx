'use client'

import { useState, useRef } from 'react'
import type { Supplier } from '@/types'

export default function ImportTrigger({ suppliers }: { suppliers: Pick<Supplier, 'id' | 'name' | 'type' | 'column_map'>[] }) {
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const supplier = suppliers.find((s) => s.id === selectedSupplier)

  async function handleImport() {
    if (!selectedSupplier) return
    setLoading(true)
    setMessage('')

    try {
      if (supplier?.type === 'spreadsheet') {
        const file = fileRef.current?.files?.[0]
        if (!file) { setMessage('Please select a CSV or Excel file'); setLoading(false); return }
        const formData = new FormData()
        formData.append('file', file)
        formData.append('supplierId', selectedSupplier)
        if (categoryId) formData.append('categoryId', categoryId)

        const res = await fetch('/api/import/csv', { method: 'POST', body: formData })
        const json = await res.json()
        setMessage(res.ok
          ? `Import started! Job ID: ${json.jobId}. Refresh in a moment to see results.`
          : `Error: ${json.error}`)
      } else {
        const res = await fetch(`/api/import/api/${selectedSupplier}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryId }),
        })
        const json = await res.json()
        setMessage(res.ok
          ? `API sync started! Job ID: ${json.jobId}.`
          : `Error: ${json.error}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Trigger Import</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
          <select
            value={selectedSupplier}
            onChange={(e) => { setSelectedSupplier(e.target.value); setMessage('') }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Select a supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
            ))}
          </select>
        </div>

        {supplier && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Category ID (optional)
              </label>
              <input
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                placeholder="UUID of category to assign products to"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs"
              />
            </div>

            {supplier.type === 'spreadsheet' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CSV / Excel File</label>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="w-full text-sm" />
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={loading}
              className="bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Starting import…' : supplier.type === 'api' ? 'Sync from API' : 'Upload & Import'}
            </button>
          </>
        )}

        {message && (
          <p className={`text-sm p-3 rounded-lg ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
