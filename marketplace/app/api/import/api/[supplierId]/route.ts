import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchFromApi } from '@/lib/suppliers/api-importer'
import { upsertProducts } from '@/lib/suppliers/upsert'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  try {
    const { supplierId } = await params
    const body = await req.json().catch(() => ({}))
    const categoryId: string | null = body.categoryId ?? null

    const supabase = createServiceClient()

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single()

    if (error || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    if (supplier.type !== 'api' || !supplier.api_config) {
      return NextResponse.json(
        { error: 'Supplier is not an API type or has no api_config' },
        { status: 400 }
      )
    }

    const { data: job } = await supabase
      .from('import_jobs')
      .insert({
        supplier_id: supplierId,
        type: 'api',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (!job) return NextResponse.json({ error: 'Failed to create import job' }, { status: 500 })

    // Run async in background
    runApiImport(supplier, categoryId, job.id, supabase)

    return NextResponse.json({ jobId: job.id, message: 'API sync started' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

async function runApiImport(
  supplier: { id: string; api_config: unknown; [key: string]: unknown },
  categoryId: string | null,
  jobId: string,
  supabase: ReturnType<typeof createServiceClient>
) {
  try {
    const products = await fetchFromApi(supplier as Parameters<typeof fetchFromApi>[0])
    await upsertProducts(supplier.id, categoryId, products, jobId)
    await supabase
      .from('import_jobs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', jobId)
  } catch (err) {
    await supabase
      .from('import_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_log: [{ error: String(err) }],
      })
      .eq('id', jobId)
  }
}
