/** Normalised product data from any supplier source */
export interface SupplierProduct {
  supplierSku: string
  name: string
  description?: string
  costPrice: number
  stock?: number
  images?: string[]          // URLs — will be uploaded to Supabase Storage
  attributes?: Record<string, string>
  categoryHint?: string      // supplier's category label, used for auto-mapping
  weight?: number            // kg
}

export interface ImportResult {
  imported: number
  updated: number
  failed: number
  errors: Array<{ sku: string; error: string }>
}
