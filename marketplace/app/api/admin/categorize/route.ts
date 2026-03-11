import { NextRequest } from 'next/server'
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

type ProgressMsg =
  | { step: 'loading' | 'grouping' | 'ai' | 'creating' | 'assigning' | 'progress'; message: string }
  | { step: 'done'; message: string; assigned: number; created: number; total: number }
  | { step: 'error'; message: string }

const BATCH_SIZE = 80

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) {
    return new Response(JSON.stringify({ step: 'error', message: 'Unauthorized' }) + '\n', { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') {
    return new Response(
      JSON.stringify({ step: 'error', message: 'ANTHROPIC_API_KEY not configured in .env.local' }) + '\n',
      { status: 500 }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(msg: ProgressMsg) {
        controller.enqueue(encoder.encode(JSON.stringify(msg) + '\n'))
      }

      try {
        const supabase = createServiceClient()

        send({ step: 'loading', message: 'Loading existing categories…' })

        const { data: categoriesRaw } = await supabase
          .from('marketplace_categories')
          .select('id, name, slug, margin_percentage')
          .order('name')

        // Mutable list so newly created categories are included in subsequent batches
        const liveCategories: Array<{ id: string; name: string; slug: string; margin_percentage: number }> =
          [...(categoriesRaw ?? [])]

        send({ step: 'loading', message: 'Fetching uncategorized products…' })

        // Supabase caps at 1,000 rows per request — paginate to get ALL uncategorized products
        const PAGE_SIZE = 1000
        let pageIndex = 0
        const uncategorized: Array<{ id: string; name: string; attributes: Record<string, string> | null }> = []
        while (true) {
          const { data: page } = await supabase
            .from('marketplace_products')
            .select('id, name, attributes')
            .is('category_id', null)
            .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1)
          if (!page || page.length === 0) break
          uncategorized.push(...page)
          if (page.length < PAGE_SIZE) break
          pageIndex++
        }

        if (uncategorized.length === 0) {
          send({ step: 'done', message: 'All products are already categorized!', assigned: 0, created: 0, total: 0 })
          controller.close()
          return
        }

        send({ step: 'loading', message: `Found ${uncategorized.length.toLocaleString()} uncategorized products across ${pageIndex + 1} page${pageIndex > 0 ? 's' : ''}. Grouping by category hint…` })

        // Group product IDs by their hint (categoryHint attr, brand attr, or first word of name)
        const hintGroups: Record<string, string[]> = {}
        for (const p of uncategorized) {
          const attrs = p.attributes as Record<string, string> | null
          const hint = attrs?.categoryHint ?? attrs?.brand ?? p.name.split(' ')[0] ?? 'General'
          if (!hintGroups[hint]) hintGroups[hint] = []
          hintGroups[hint].push(p.id)
        }

        const allHints = Object.keys(hintGroups)
        const totalBatches = Math.ceil(allHints.length / BATCH_SIZE)

        send({
          step: 'grouping',
          message: `${allHints.length} unique hints found → ${totalBatches} batch${totalBatches !== 1 ? 'es' : ''} of ${BATCH_SIZE} to send to Claude.`,
        })

        let totalAssigned = 0
        let totalCreated = 0

        for (let batchIdx = 0; batchIdx < allHints.length; batchIdx += BATCH_SIZE) {
          const batchHints = allHints.slice(batchIdx, batchIdx + BATCH_SIZE)
          const batchNum = Math.floor(batchIdx / BATCH_SIZE) + 1

          send({ step: 'ai', message: `Batch ${batchNum}/${totalBatches} — asking Claude about ${batchHints.length} hints…` })

          const catList = liveCategories.length > 0
            ? liveCategories.map((c) => `- ${c.name} (id: ${c.id})`).join('\n')
            : '(none yet — create new categories as needed)'

          const hintList = batchHints.map((h, i) => `${i + 1}. "${h}"`).join('\n')

          const prompt = `You are a product categorization assistant for an Australian IT and office supplies marketplace.

Existing categories:
${catList}

Supplier category hints / brands to categorize:
${hintList}

For each hint, either match it to an existing category (use the exact id) or suggest a new category name.

Rules:
- Be practical — think what a customer would search for
- Group similar items (e.g. "Printers", "Printer Ink & Toner", "Labels & Tape", "Networking", "Cables", "Monitors", "Laptops")
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
            send({ step: 'error', message: `Batch ${batchNum}: AI request failed — ${String(err)}` })
            // Continue with next batch rather than aborting entirely
            continue
          }

          let parsed: {
            assignments: Record<string, string | null>
            newCategories: Array<{ name: string; hints: string[] }>
          }
          try {
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
            parsed = JSON.parse(jsonMatch?.[0] ?? aiResponse)
          } catch {
            send({ step: 'error', message: `Batch ${batchNum}: Claude returned invalid JSON — skipping.` })
            continue
          }

          // Create new categories suggested by Claude
          const newCatMap: Record<string, string> = {}
          const newCats = parsed.newCategories ?? []
          if (newCats.length > 0) {
            send({ step: 'creating', message: `Batch ${batchNum}: creating ${newCats.length} new categor${newCats.length !== 1 ? 'ies' : 'y'}…` })
          }

          for (const newCat of newCats) {
            const slug = newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
            const { data: inserted } = await supabase
              .from('marketplace_categories')
              .upsert({ name: newCat.name, slug, margin_percentage: 30 }, { onConflict: 'slug' })
              .select('id, name, slug, margin_percentage')
              .single()
            if (inserted) {
              for (const hint of (newCat.hints ?? [])) newCatMap[hint] = inserted.id
              // Add to live list so subsequent batches can reuse it
              if (!liveCategories.find((c) => c.id === inserted.id)) {
                liveCategories.push(inserted)
              }
              totalCreated++
            }
          }

          // Update products in chunks of 500 to avoid PostgREST request-size limits
          async function assignCategory(ids: string[], categoryId: string): Promise<number> {
            const CHUNK = 500
            let count = 0
            for (let ci = 0; ci < ids.length; ci += CHUNK) {
              const chunk = ids.slice(ci, ci + CHUNK)
              const { error } = await supabase
                .from('marketplace_products')
                .update({ category_id: categoryId })
                .in('id', chunk)
              if (!error) count += chunk.length
            }
            return count
          }

          // Apply category assignments to products
          let batchAssigned = 0

          for (const [hint, catId] of Object.entries(parsed.assignments ?? {})) {
            const resolvedId = catId ?? newCatMap[hint]
            if (!resolvedId) continue
            const ids = hintGroups[hint] ?? []
            if (ids.length === 0) continue
            batchAssigned += await assignCategory(ids, resolvedId)
          }

          // Apply assignments for hints that only appear in newCategories (not in assignments map)
          for (const [hint, catId] of Object.entries(newCatMap)) {
            if (parsed.assignments?.[hint] !== undefined) continue
            const ids = hintGroups[hint] ?? []
            if (ids.length === 0) continue
            batchAssigned += await assignCategory(ids, catId)
          }

          totalAssigned += batchAssigned

          send({
            step: 'progress',
            message: `Batch ${batchNum}/${totalBatches} done — assigned ${batchAssigned.toLocaleString()} products (${totalAssigned.toLocaleString()} total so far)`,
          })
        }

        send({
          step: 'done',
          message: `Done! Assigned ${totalAssigned.toLocaleString()} products across ${totalCreated} new categor${totalCreated !== 1 ? 'ies' : 'y'}.`,
          assigned: totalAssigned,
          created: totalCreated,
          total: uncategorized.length,
        })
      } catch (err) {
        send({ step: 'error', message: `Unexpected error: ${String(err)}` })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    },
  })
}
