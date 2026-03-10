import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { parseSupplierFile } from '@/lib/suppliers/csv-importer'
import { upsertProducts } from '@/lib/suppliers/upsert'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const supplierId = formData.get('supplierId') as string | null
    const categoryId = formData.get('categoryId') as string | null

    if (!file || !supplierId) {
      return NextResponse.json({ error: 'Missing file or supplierId' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch supplier config
    const { data: supplier, error: supplierErr } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single()

    if (supplierErr || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    if (!supplier.column_map) {
      return NextResponse.json(
        { error: 'This supplier has no column_map configured. Add one in the supplier settings.' },
        { status: 400 }
      )
    }

    // Create import job
    const { data: job } = await supabase
      .from('import_jobs')
      .insert({
        supplier_id: supplierId,
        type: 'csv',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (!job) return NextResponse.json({ error: 'Failed to create import job' }, { status: 500 })

    // Parse file in the background (don't await, return job ID immediately)
    const buffer = Buffer.from(await file.arrayBuffer())
    runImport(buffer, file.name, supplier.column_map, supplierId, categoryId, job.id, supabase)

    return NextResponse.json({ jobId: job.id, message: 'Import started' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

async function runImport(
  buffer: Buffer,
  filename: string,
  columnMap: Record<string, string>,
  supplierId: string,
  categoryId: string | null,
  jobId: string,
  supabase: ReturnType<typeof createServiceClient>
) {
  try {
    const products = parseSupplierFile(buffer, filename, columnMap)
    await upsertProducts(supplierId, categoryId, products, jobId)
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
