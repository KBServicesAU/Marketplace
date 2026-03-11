import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { SupplierProduct } from './types'

/**
 * Parse a CSV or Excel file buffer into normalised SupplierProduct records.
 *
 * @param buffer      Raw file buffer
 * @param filename    Original filename (used to detect CSV vs Excel)
 * @param columnMap   Maps CSV column headers → SupplierProduct field names
 *                    e.g. { "Product Code": "supplierSku", "Retail Price": "costPrice" }
 */
export function parseSupplierFile(
  buffer: Buffer,
  filename: string,
  columnMap: Record<string, string>
): SupplierProduct[] {
  const isExcel = /\.(xlsx|xls|xlsm)$/i.test(filename)

  let rows: Record<string, string>[]

  if (isExcel) {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' })
  } else {
    const text = buffer.toString('utf-8')
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    })
    rows = parsed.data
  }

  return rows
    .map((row) => mapRowToProduct(row, columnMap))
    .filter((p): p is SupplierProduct => p !== null)
}

function mapRowToProduct(
  row: Record<string, string>,
  columnMap: Record<string, string>
): SupplierProduct | null {
  const mapped: Record<string, string> = {}
  // Collect all image URLs from multiple columns that map to 'images'
  const imageUrls: string[] = []

  for (const [csvCol, productField] of Object.entries(columnMap)) {
    const value = (row[csvCol] ?? '').trim()
    if (!value) continue

    if (productField === 'images') {
      // Each column mapped to 'images' contributes its URL(s) to the list
      const urls = value.split('|').map((u) => u.trim()).filter(Boolean)
      imageUrls.push(...urls)
    } else {
      mapped[productField] = value
    }
  }

  const supplierSku = mapped['supplierSku']
  const name = mapped['name']
  const costPriceRaw = mapped['costPrice']

  if (!supplierSku || !name || !costPriceRaw) return null

  const costPrice = parseFloat(costPriceRaw.replace(/[^0-9.]/g, ''))
  if (isNaN(costPrice) || costPrice < 0) return null

  const product: SupplierProduct = {
    supplierSku,
    name,
    costPrice,
  }

  if (mapped['description']) product.description = mapped['description']
  if (mapped['stock']) {
    const stock = parseInt(mapped['stock'])
    if (!isNaN(stock)) product.stock = stock
  }
  if (mapped['categoryHint']) product.categoryHint = mapped['categoryHint']
  if (mapped['weight']) {
    const weight = parseFloat(mapped['weight'])
    if (!isNaN(weight)) product.weight = weight
  }

  // Images: collected from one or more columns
  if (imageUrls.length > 0) product.images = imageUrls

  // Any remaining mapped fields go into attributes
  const reservedFields = new Set([
    'supplierSku', 'name', 'costPrice', 'description',
    'stock', 'categoryHint', 'weight', 'brand',
  ])
  const attributes: Record<string, string> = {}
  for (const [field, value] of Object.entries(mapped)) {
    if (!reservedFields.has(field) && value) {
      attributes[field] = value
    }
  }
  if (mapped['brand']) attributes['brand'] = mapped['brand']
  if (Object.keys(attributes).length > 0) product.attributes = attributes

  return product
}
