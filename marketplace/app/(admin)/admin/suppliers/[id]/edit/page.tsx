import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SupplierForm from '@/components/admin/SupplierForm'

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data: supplier } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (!supplier) notFound()
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit Supplier</h1>
      <SupplierForm supplier={supplier} />
    </div>
  )
}
