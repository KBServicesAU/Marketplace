import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Category } from '@/types'

export default async function CategoriesPage() {
  const supabase = createServiceClient()
  const { data: categories } = await supabase
    .from('marketplace_categories')
    .select('*')
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <Link
          href="/admin/categories/new"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
        >
          + Add Category
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Slug</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Margin %</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories?.map((c: Category) => (
              <tr key={c.id}>
                <td className="px-6 py-4 font-medium">{c.name}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{c.slug}</td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-green-700">{c.margin_percentage}%</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/admin/categories/${c.id}/edit`} className="text-gray-500 hover:text-gray-900 text-xs underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {(!categories || categories.length === 0) && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  No categories yet. <Link href="/admin/categories/new" className="underline">Add your first category.</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
