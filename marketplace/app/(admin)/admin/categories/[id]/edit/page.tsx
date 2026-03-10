import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CategoryForm from '@/components/admin/CategoryForm'

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data: category } = await supabase.from('marketplace_categories').select('*').eq('id', id).single()
  if (!category) notFound()
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit Category</h1>
      <CategoryForm category={category} />
    </div>
  )
}
