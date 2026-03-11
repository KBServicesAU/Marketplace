import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'

async function checkAdmin(req: NextRequest): Promise<boolean> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim())
  return adminEmails.includes(user.email ?? '')
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set in environment' }, { status: 500 })

  const supabase = createServiceClient()

  const { data: categories } = await supabase
    .from('marketplace_categories')
    .select('id, name, slug, margin_percentage')
    .order('name')

  const { data: uncategorized } = await supabase
    .from('marketplace_products')
    .select('id, name, attributes')
    .is('category_id', null)
    .limit(2000)

  if (!uncategorized || uncategorized.length === 0) {
    return NextResponse.json({ message: 'All products are already categorized!', assigned: 0, created: 0 })
  }

  // Group products by their categoryHint or brand from attributes
  const hintGroups: Record<string, string[]> = {}
  for (const p of uncategorized) {
    const attrs = p.attributes as Record<string, string> | null
    const hint = attrs?.categoryHint ?? attrs?.brand ?? p.name.split(' ')[0] ?? 'General'
    if (!hintGroups[hint]) hintGroups[hint] = []
    hintGroups[hint].push(p.id)
  }

  const uniqueHints = Object.keys(hintGroups).slice(0, 80)

  const catList = (categories ?? []).length > 0
    ? (categories ?? []).map((c) => `- ${c.name} (id: ${c.id})`).join('\n')
    : '(none yet — create new categories as needed)'

  const hintList = uniqueHints.map((h, i) => `${i + 1}. "${h}"`).join('\n')

  const prompt = `You are a product categorization assistant for an Australian IT and office supplies marketplace.

Existing categories:
${catList}

Supplier category hints / brands to categorize:
${hintList}

For each hint, either match it to an existing category (use the exact id) or suggest a new category name.

Rules:
- Be practical — think what a customer would search for
- Group similar items (e.g. "Printers", "Printer Ink & Toner", "Labels & Tape", "Networking", "Cables")
- Prefer matching existing categories over creating new ones
- Only create new categories when there is no reasonable existing match

Respond with ONLY valid JSON, no explanation, no markdown fences:
{
  "assignments": { "hint text": "existing-category-id-or-null" },
  "newCategories": [{ "name": "Category Name", "hints": ["hint1", "hint2"] }]
}`

  let aiResponse: string
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message ?? `Anthropic ${res.status}`)
    aiResponse = data.content[0].text
  } catch (err) {
    return NextResponse.json({ error: `AI request failed: ${String(err)}` }, { status: 500 })
  }

  let parsed: {
    assignments: Record<string, string | null>
    newCategories: Array<{ name: string; hints: string[] }>
  }
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] ?? aiResponse)
  } catch {
    return NextResponse.json({ error: 'AI returned invalid JSON', raw: aiResponse.slice(0, 500) }, { status: 500 })
  }

  let assigned = 0
  let created = 0
  const newCatMap: Record<string, string> = {}

  // Create new categories
  for (const newCat of (parsed.newCategories ?? [])) {
    const slug = newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const { data: inserted } = await supabase
      .from('marketplace_categories')
      .upsert({ name: newCat.name, slug, margin_percentage: 30 }, { onConflict: 'slug' })
      .select('id')
      .single()
    if (inserted) {
      for (const hint of (newCat.hints ?? [])) newCatMap[hint] = inserted.id
      created++
    }
  }

  // Apply category assignments
  for (const [hint, catId] of Object.entries(parsed.assignments ?? {})) {
    const resolvedId = catId ?? newCatMap[hint]
    if (!resolvedId) continue
    const ids = hintGroups[hint] ?? []
    if (ids.length === 0) continue
    const { error } = await supabase
      .from('marketplace_products')
      .update({ category_id: resolvedId })
      .in('id', ids)
    if (!error) assigned += ids.length
  }

  // Apply new category assignments for hints not in assignments
  for (const [hint, catId] of Object.entries(newCatMap)) {
    if (parsed.assignments?.[hint] !== undefined) continue
    const ids = hintGroups[hint] ?? []
    if (ids.length === 0) continue
    await supabase.from('marketplace_products').update({ category_id: catId }).in('id', ids)
    assigned += ids.length
  }

  return NextResponse.json({
    message: `Done! Assigned ${assigned} products to categories, created ${created} new categories.`,
    assigned,
    created,
    totalUncategorized: uncategorized.length,
  })
}
