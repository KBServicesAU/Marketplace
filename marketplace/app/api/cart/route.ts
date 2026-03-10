import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { Cart, CartItem } from '@/types'

const CART_COOKIE = 'marketplace_cart'

async function getCart(): Promise<Cart> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(CART_COOKIE)?.value
  if (!raw) return { items: [] }
  try { return JSON.parse(raw) as Cart } catch { return { items: [] } }
}

async function saveCart(cart: Cart) {
  const cookieStore = await cookies()
  cookieStore.set(CART_COOKIE, JSON.stringify(cart), {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
  })
}

// POST: add item to cart
export async function POST(req: NextRequest) {
  const body: CartItem = await req.json()
  const cart = await getCart()
  const existing = cart.items.find((i) => i.productId === body.productId)
  if (existing) {
    existing.quantity += body.quantity
  } else {
    cart.items.push(body)
  }
  await saveCart(cart)
  return NextResponse.json(cart)
}

// PATCH: update quantity
export async function PATCH(req: NextRequest) {
  const { productId, quantity } = await req.json()
  const cart = await getCart()
  if (quantity <= 0) {
    cart.items = cart.items.filter((i) => i.productId !== productId)
  } else {
    const item = cart.items.find((i) => i.productId === productId)
    if (item) item.quantity = quantity
  }
  await saveCart(cart)
  return NextResponse.json(cart)
}

// DELETE: remove item
export async function DELETE(req: NextRequest) {
  const { productId } = await req.json()
  const cart = await getCart()
  cart.items = cart.items.filter((i) => i.productId !== productId)
  await saveCart(cart)
  return NextResponse.json(cart)
}

// GET: read cart
export async function GET() {
  const cart = await getCart()
  return NextResponse.json(cart)
}
