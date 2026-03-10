import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { Cart, ShippingAddress } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { shippingAddress, customerId, guestEmail } = await req.json() as {
      shippingAddress: ShippingAddress
      customerId?: string
      guestEmail?: string
    }

    const cookieStore = await cookies()
    const raw = cookieStore.get('marketplace_cart')?.value
    if (!raw) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

    const cart: Cart = JSON.parse(raw)
    if (cart.items.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

    const supabase = createServiceClient()

    // Get supplier shipping rates
    const supplierIds = [...new Set(cart.items.map((i) => i.supplierId))]
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, shipping_rate')
      .in('id', supplierIds)

    const shippingMap: Record<string, number> = {}
    for (const s of suppliers ?? []) shippingMap[s.id] = Number(s.shipping_rate)

    const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0)
    const shippingTotal = supplierIds.reduce((s, sid) => s + (shippingMap[sid] ?? 0), 0)
    const total = subtotal + shippingTotal

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // cents
      currency: 'aud',
      metadata: { customerId: customerId ?? '', guestEmail: guestEmail ?? '' },
    })

    // Create pending order in DB
    const { data: order } = await supabase
      .from('marketplace_orders')
      .insert({
        customer_id: customerId ?? null,
        guest_email: guestEmail ?? null,
        status: 'pending',
        subtotal,
        shipping_total: shippingTotal,
        total,
        stripe_payment_intent_id: paymentIntent.id,
        shipping_address: shippingAddress,
      })
      .select('id')
      .single()

    if (!order) return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })

    // Create order items
    const items = cart.items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      supplier_id: i.supplierId,
      product_name: i.name,
      product_sku: i.productId,
      quantity: i.quantity,
      unit_price: i.price,
      subtotal: i.price * i.quantity,
    }))
    await supabase.from('marketplace_order_items').insert(items)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      subtotal,
      shippingTotal,
      total,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
