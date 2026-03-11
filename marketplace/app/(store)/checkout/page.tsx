'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { formatPrice } from '@/lib/pricing'
import type { Cart, ShippingAddress } from '@/types'
import Link from 'next/link'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// ── Inner payment form (needs to be inside <Elements>) ──────────────────────
function PaymentForm({
  total,
  orderId,
}: {
  total: number
  orderId: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError('')

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?order=${orderId}`,
      },
    })

    if (error) {
      setError(error.message ?? 'Payment failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-gray-900 text-white py-3 rounded-full font-semibold hover:bg-gray-700 disabled:opacity-50 transition"
      >
        {loading ? 'Processing…' : `Pay ${formatPrice(total)}`}
      </button>
    </form>
  )
}

// ── Main checkout page ───────────────────────────────────────────────────────
export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [clientSecret, setClientSecret] = useState('')
  const [orderId, setOrderId] = useState('')
  const [totals, setTotals] = useState({ subtotal: 0, shippingTotal: 0, total: 0 })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<ShippingAddress>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'AU',
  })

  useEffect(() => {
    fetch('/api/cart').then((r) => r.json()).then(setCart)
  }, [])

  function set(field: keyof ShippingAddress, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingAddress: form, guestEmail: form.email }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setClientSecret(data.clientSecret)
    setOrderId(data.orderId)
    setTotals({ subtotal: data.subtotal, shippingTotal: data.shippingTotal, total: data.total })
    setStep('payment')
    setSubmitting(false)
  }

  if (!cart) {
    return <div className="text-center py-20 text-gray-400">Loading…</div>
  }

  if (cart.items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
        <Link href="/products" className="text-gray-900 underline">Continue shopping</Link>
      </div>
    )
  }

  const cartSubtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0)

  const fields: Array<{ key: keyof ShippingAddress; label: string; type?: string; required?: boolean }> = [
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'address_line1', label: 'Address' },
    { key: 'address_line2', label: 'Apartment, suite, etc.', required: false },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'postcode', label: 'Postcode' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center gap-3 text-sm text-gray-500">
        <Link href="/cart" className="hover:text-gray-900">Cart</Link>
        <span>›</span>
        <span className={step === 'address' ? 'text-gray-900 font-medium' : ''}>Shipping</span>
        <span>›</span>
        <span className={step === 'payment' ? 'text-gray-900 font-medium' : ''}>Payment</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* ── Left: form ── */}
        <div className="lg:col-span-3">
          {step === 'address' && (
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping address</h2>

              <div className="grid grid-cols-2 gap-3">
                {(['first_name', 'last_name'] as const).map((f) => (
                  <div key={f}>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                      {f === 'first_name' ? 'First name' : 'Last name'}
                    </label>
                    <input
                      value={form[f]}
                      onChange={(e) => set(f, e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                ))}
              </div>

              {fields.map(({ key, label, type = 'text', required = true }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={form[key] ?? ''}
                    onChange={(e) => set(key, e.target.value)}
                    required={required}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              ))}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gray-900 text-white py-3 rounded-full font-semibold hover:bg-gray-700 disabled:opacity-50 transition mt-2"
              >
                {submitting ? 'Calculating…' : 'Continue to payment'}
              </button>
            </form>
          )}

          {step === 'payment' && clientSecret && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Payment</h2>
                <button
                  onClick={() => setStep('address')}
                  className="text-sm text-gray-500 hover:text-gray-900 underline"
                >
                  ← Edit address
                </button>
              </div>
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                <PaymentForm total={totals.total} orderId={orderId} />
              </Elements>
            </div>
          )}
        </div>

        {/* ── Right: order summary ── */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 rounded-2xl p-6 sticky top-24">
            <h2 className="font-semibold text-gray-900 mb-4">Order summary</h2>
            <div className="space-y-3 mb-4">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate max-w-[180px]">
                    {item.name}
                    <span className="text-gray-400"> × {item.quantity}</span>
                  </span>
                  <span className="font-medium shrink-0 ml-2">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatPrice(step === 'payment' ? totals.subtotal : cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span>
                  {step === 'payment' ? formatPrice(totals.shippingTotal) : 'Calculated next'}
                </span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-2">
                <span>Total</span>
                <span>{formatPrice(step === 'payment' ? totals.total : cartSubtotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
