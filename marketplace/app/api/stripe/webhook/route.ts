import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err}` }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    await supabase
      .from('marketplace_orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('stripe_payment_intent_id', intent.id)
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent
    await supabase
      .from('marketplace_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('stripe_payment_intent_id', intent.id)
  }

  return NextResponse.json({ received: true })
}
