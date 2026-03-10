import { createServiceClient } from '@/lib/supabase/server'
import { calculateSellingPrice } from '@/lib/pricing'
import type { SupplierProduct, ImportResult } from './types'

/**
 * Upsert a batch of SupplierProducts into marketplace_products.
 * - Matches on (supplier_id, supplier_sku)
 * - Calculates selling_price from category margin
 * - Uploads images to Supabase Storage (skips if already a Supabase URL)
 * - Generates URL-safe slug from name + sku
 */
export async function upsertProducts(
  supplierId: string,
  defaultCategoryId: string | null,
  products: SupplierProduct[],
  jobId: string
): Promise<ImportResult> {
  const supabase = createServiceClient()
  const result: ImportResult = { imported: 0, updated: 0, failed: 0, errors: [] }

  // Fetch the category margins we may need
  const { data: categories } = await supabase
    .from('marketplace_categories')
    .select('id, margin_percentage')

  const marginMap: Record<string, number> = {}
  for (const cat of categories ?? []) {
    marginMap[cat.id] = cat.margin_percentage
  }

  // Fetch existing skus for this supplier to detect insert vs update
  const { data: existing } = await supabase
    .from('marketplace_products')
    .select('id, supplier_sku')
    .eq('supplier_id', supplierId)

  const existingSkus = new Set((existing ?? []).map((r) => r.supplier_sku))

  // Process in batches of 200
  const BATCH = 200
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH)
    const rows = await Promise.all(
      batch.map(async (p) => {
        try {
          return await buildProductRow(p, supplierId, defaultCategoryId, marginMap, supabase)
        } catch (err) {
          result.failed++
          result.errors.push({ sku: p.supplierSku, error: String(err) })
          return null
        }
      })
    )

    const validRows = rows.filter((r): r is NonNullable<typeof r> => r !== null)
    if (validRows.length === 0) continue

    const { error } = await supabase
      .from('marketplace_products')
      .upsert(validRows, {
        onConflict: 'supplier_id,supplier_sku',
        ignoreDuplicates: false,
      })

    if (error) {
      result.failed += validRows.length
      result.errors.push({ sku: 'batch', error: error.message })
      continue
    }

    for (const row of validRows) {
      if (existingSkus.has(row.supplier_sku)) {
        result.updated++
      } else {
        result.imported++
      }
    }
  }

  // Update the import job progress
  await supabase
    .from('import_jobs')
    .update({
      products_imported: result.imported,
      products_updated: result.updated,
      products_failed: result.failed,
      error_log: result.errors.length > 0 ? result.errors.slice(0, 100) : null,
    })
    .eq('id', jobId)

  return result
}

async function buildProductRow(
  p: SupplierProduct,
  supplierId: string,
  defaultCategoryId: string | null,
  marginMap: Record<string, number>,
  supabase: ReturnType<typeof createServiceClient>
) {
  const categoryId = defaultCategoryId
  const margin = categoryId ? (marginMap[categoryId] ?? 30) : 30
  const sellingPrice = calculateSellingPrice(p.costPrice, margin)
  const slug = generateSlug(p.name, p.supplierSku)

  // Upload images to Supabase Storage if they're external URLs
  let imageUrls: string[] = []
  if (p.images && p.images.length > 0) {
    imageUrls = await Promise.all(
      p.images.slice(0, 5).map((url) => uploadImage(url, supplierId, p.supplierSku, supabase))
    )
    imageUrls = imageUrls.filter(Boolean)
  }

  return {
    supplier_id: supplierId,
    category_id: categoryId,
    supplier_sku: p.supplierSku,
    name: p.name,
    slug,
    description: p.description ?? null,
    cost_price: p.costPrice,
    selling_price: sellingPrice,
    stock: p.stock ?? 0,
    images: imageUrls,
    attributes: p.attributes ?? null,
    is_active: true,
    last_synced_at: new Date().toISOString(),
  }
}

async function uploadImage(
  url: string,
  supplierId: string,
  sku: string,
  supabase: ReturnType<typeof createServiceClient>
): Promise<string> {
  // If already a Supabase Storage URL, return as-is
  if (url.includes('supabase.co/storage')) return url

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return url  // fall back to original URL

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.split('/')[1]?.split(';')[0] ?? 'jpg'
    const buffer = Buffer.from(await res.arrayBuffer())

    const path = `${supplierId}/${sanitizeFilename(sku)}-${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, buffer, { contentType, upsert: true })

    if (error) return url

    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return url  // fall back to original URL on any error
  }
}

function generateSlug(name: string, sku: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = sku.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)
  return `${base}-${suffix}`.slice(0, 200)
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)
}
