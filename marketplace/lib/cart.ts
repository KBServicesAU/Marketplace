'use server'

import { cookies } from 'next/headers'
import type { Cart, CartItem } from '@/types'

const CART_COOKIE = 'marketplace_cart'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function getCart(): Promise<Cart> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(CART_COOKIE)?.value
  if (!raw) return { items: [] }
  try {
    return JSON.parse(raw) as Cart
  } catch {
    return { items: [] }
  }
}

export async function addToCart(item: CartItem): Promise<Cart> {
  const cart = await getCart()
  const existing = cart.items.find((i) => i.productId === item.productId)
  if (existing) {
    existing.quantity += item.quantity
  } else {
    cart.items.push(item)
  }
  await saveCart(cart)
  return cart
}

export async function updateCartQuantity(productId: string, quantity: number): Promise<Cart> {
  const cart = await getCart()
  if (quantity <= 0) {
    cart.items = cart.items.filter((i) => i.productId !== productId)
  } else {
    const item = cart.items.find((i) => i.productId === productId)
    if (item) item.quantity = quantity
  }
  await saveCart(cart)
  return cart
}

export async function removeFromCart(productId: string): Promise<Cart> {
  const cart = await getCart()
  cart.items = cart.items.filter((i) => i.productId !== productId)
  await saveCart(cart)
  return cart
}

export async function clearCart(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(CART_COOKIE, '', { maxAge: 0 })
}

async function saveCart(cart: Cart): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(CART_COOKIE, JSON.stringify(cart), {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: false,   // readable by client JS for cart UI
    sameSite: 'lax',
    path: '/',
  })
}

/** Calculate cart totals including per-supplier shipping */
export function getCartTotals(
  cart: Cart,
  supplierShippingRates: Record<string, number>
): { subtotal: number; shippingTotal: number; total: number } {
  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  // Each unique supplier contributes its flat rate once
  const supplierIds = [...new Set(cart.items.map((i) => i.supplierId))]
  const shippingTotal = supplierIds.reduce(
    (sum, sid) => sum + (supplierShippingRates[sid] ?? 0),
    0
  )

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shippingTotal: Math.round(shippingTotal * 100) / 100,
    total: Math.round((subtotal + shippingTotal) * 100) / 100,
  }
}
