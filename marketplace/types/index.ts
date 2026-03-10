// ============================================================
// Shared TypeScript types for the marketplace
// ============================================================

export interface Supplier {
  id: string
  name: string
  type: 'spreadsheet' | 'api'
  shipping_rate: number
  api_config: ApiConfig | null
  column_map: Record<string, string> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiConfig {
  base_url: string
  auth_type: 'bearer' | 'api_key' | 'basic' | 'none'
  auth_value?: string
  auth_header?: string      // custom header name for api_key type
  field_map: Record<string, string>  // their field name → our SupplierProduct field
  pagination?: {
    type: 'page' | 'cursor' | 'offset'
    page_param?: string
    size_param?: string
    page_size?: number
    cursor_field?: string   // field in response containing next cursor
    cursor_param?: string   // query param name for cursor
    total_field?: string    // field in response with total count
    data_field?: string     // field in response containing the product array
  }
}

export interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
  margin_percentage: number
  created_at: string
}

export interface Product {
  id: string
  supplier_id: string | null
  category_id: string | null
  supplier_sku: string
  name: string
  slug: string
  description: string | null
  cost_price: number
  selling_price: number
  stock: number
  images: string[]
  attributes: Record<string, string> | null
  is_active: boolean
  last_synced_at: string | null
  created_at: string
  updated_at: string
  // joined
  supplier?: Pick<Supplier, 'id' | 'name' | 'shipping_rate'>
  category?: Pick<Category, 'id' | 'name' | 'slug'>
}

export interface MarketplaceCustomer {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
}

export interface CustomerAddress {
  id: string
  customer_id: string
  label: string | null
  address_line1: string
  address_line2: string | null
  city: string
  state: string | null
  postcode: string
  country: string
  is_default: boolean
  created_at: string
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export interface Order {
  id: string
  customer_id: string | null
  guest_email: string | null
  status: OrderStatus
  subtotal: number
  shipping_total: number
  total: number
  stripe_payment_intent_id: string | null
  shipping_address: ShippingAddress
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  items?: OrderItem[]
  customer?: Pick<MarketplaceCustomer, 'id' | 'email' | 'first_name' | 'last_name'>
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  supplier_id: string | null
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface ShippingAddress {
  first_name: string
  last_name: string
  email: string
  phone?: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postcode: string
  country: string
}

export interface ImportJob {
  id: string
  supplier_id: string
  type: 'csv' | 'api'
  status: 'pending' | 'running' | 'completed' | 'failed'
  products_imported: number
  products_updated: number
  products_failed: number
  error_log: unknown | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  // joined
  supplier?: Pick<Supplier, 'id' | 'name'>
}

// ============================================================
// Cart types (stored in cookie)
// ============================================================

export interface CartItem {
  productId: string
  supplierId: string
  name: string
  slug: string
  image: string | null
  price: number
  quantity: number
}

export interface Cart {
  items: CartItem[]
}
