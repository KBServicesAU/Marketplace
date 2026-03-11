import type { ApiConfig, Supplier } from '@/types'
import type { SupplierProduct } from './types'

/**
 * Fetch all products from a supplier's API using the generic adapter.
 * Reads the supplier's api_config to know how to authenticate and paginate.
 * Supports: bearer token, OAuth2 client credentials, API key header, basic auth.
 */
export async function fetchFromApi(supplier: Supplier): Promise<SupplierProduct[]> {
  const config = supplier.api_config
  if (!config) throw new Error(`Supplier "${supplier.name}" has no api_config set`)

  // Resolve auth token upfront (OAuth2 does a token exchange first)
  const authToken = config.auth_type === 'oauth2'
    ? await fetchOAuth2Token(config)
    : null

  const allProducts: SupplierProduct[] = []
  let page = 1
  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const url = buildUrl(config, page, cursor)
    const headers = buildHeaders(config, authToken)

    const res = await fetch(url, { headers })
    if (!res.ok) {
      throw new Error(`API request failed: ${res.status} ${res.statusText} — ${url}`)
    }

    const json = await res.json()
    const dataField = config.pagination?.data_field ?? 'data'
    const raw: unknown[] = getNestedValue(json, dataField) ?? (Array.isArray(json) ? json : [])

    const products = raw.map((item) => mapApiItem(item as Record<string, unknown>, config.field_map))
    allProducts.push(...products.filter((p): p is SupplierProduct => p !== null))

    // Determine if there are more pages
    hasMore = false
    const paging = config.pagination
    if (paging) {
      if (paging.type === 'page') {
        const totalField = paging.total_field ?? 'total'
        const total = getNestedValue(json, totalField) as number | undefined
        const pageSize = paging.page_size ?? 100
        if (total && allProducts.length < total) {
          hasMore = true
          page++
        }
      } else if (paging.type === 'cursor') {
        const nextCursor = getNestedValue(json, paging.cursor_field ?? 'next_cursor') as string | undefined
        if (nextCursor) {
          hasMore = true
          cursor = nextCursor
        }
      } else if (paging.type === 'offset') {
        const pageSize = paging.page_size ?? 100
        if (raw.length >= pageSize) {
          hasMore = true
          page++
        }
      }
    }
  }

  return allProducts
}

/**
 * Exchange client_id:client_secret for an OAuth2 bearer token.
 * auth_value format: "client_id:client_secret"
 * token_url: the supplier's token endpoint
 */
async function fetchOAuth2Token(config: ApiConfig): Promise<string> {
  const tokenUrl = config.token_url
  if (!tokenUrl) throw new Error('OAuth2 auth_type requires token_url to be set in api_config')

  const [clientId, ...rest] = (config.auth_value ?? '').split(':')
  const clientSecret = rest.join(':') // allow colons in secret

  if (!clientId || !clientSecret) {
    throw new Error('OAuth2 auth_value must be in format "client_id:client_secret"')
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  })

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OAuth2 token request failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  if (!data.access_token) {
    throw new Error(`OAuth2 response did not include access_token: ${JSON.stringify(data)}`)
  }

  return data.access_token as string
}

function buildUrl(config: ApiConfig, page: number, cursor?: string): string {
  const url = new URL(config.base_url)
  const paging = config.pagination

  if (paging?.type === 'page') {
    url.searchParams.set(paging.page_param ?? 'page', String(page))
    if (paging.size_param) url.searchParams.set(paging.size_param, String(paging.page_size ?? 100))
  } else if (paging?.type === 'cursor' && cursor) {
    url.searchParams.set(paging.cursor_param ?? 'cursor', cursor)
  } else if (paging?.type === 'offset') {
    const size = paging.page_size ?? 100
    url.searchParams.set(paging.page_param ?? 'offset', String((page - 1) * size))
    if (paging.size_param) url.searchParams.set(paging.size_param, String(size))
  }

  return url.toString()
}

function buildHeaders(config: ApiConfig, oauth2Token: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  if (oauth2Token) {
    // OAuth2 — use the fetched access token as a bearer
    headers['Authorization'] = `Bearer ${oauth2Token}`
  } else if (config.auth_type === 'bearer' && config.auth_value) {
    headers['Authorization'] = `Bearer ${config.auth_value}`
  } else if (config.auth_type === 'api_key' && config.auth_value) {
    const headerName = config.auth_header ?? 'X-API-Key'
    headers[headerName] = config.auth_value
  } else if (config.auth_type === 'basic' && config.auth_value) {
    headers['Authorization'] = `Basic ${Buffer.from(config.auth_value).toString('base64')}`
  }
  return headers
}

function mapApiItem(
  item: Record<string, unknown>,
  fieldMap: Record<string, string>
): SupplierProduct | null {
  const mapped: Record<string, unknown> = {}

  for (const [theirField, ourField] of Object.entries(fieldMap)) {
    const value = getNestedValue(item, theirField)
    if (value !== undefined) mapped[ourField] = value
  }

  const supplierSku = String(mapped['supplierSku'] ?? '')
  const name = String(mapped['name'] ?? '')
  const costPrice = parseFloat(String(mapped['costPrice'] ?? ''))

  if (!supplierSku || !name || isNaN(costPrice)) return null

  const product: SupplierProduct = { supplierSku, name, costPrice }

  if (mapped['description']) product.description = String(mapped['description'])
  if (mapped['stock'] !== undefined) product.stock = parseInt(String(mapped['stock'])) || 0
  if (mapped['categoryHint']) product.categoryHint = String(mapped['categoryHint'])
  if (mapped['weight']) product.weight = parseFloat(String(mapped['weight'])) || undefined

  // Images: string URL or array of URLs
  const imgRaw = mapped['images']
  if (typeof imgRaw === 'string' && imgRaw) {
    product.images = [imgRaw]
  } else if (Array.isArray(imgRaw)) {
    product.images = imgRaw.map(String).filter(Boolean)
  }

  return product
}

/** Access a dot-notated nested field, e.g. "meta.pagination.total" */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}
