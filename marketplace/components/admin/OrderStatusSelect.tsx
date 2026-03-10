'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']

export default function OrderStatusSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleChange(newStatus: string) {
    setSaving(true)
    await supabase.from('marketplace_orders').update({ status: newStatus }).eq('id', orderId)
    setStatus(newStatus)
    setSaving(false)
  }

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className="border border-gray-300 rounded px-2 py-1 text-xs capitalize"
    >
      {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}
