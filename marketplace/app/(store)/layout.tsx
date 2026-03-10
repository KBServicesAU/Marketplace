import { createClient } from '@/lib/supabase/server'
import StoreHeader from '@/components/store/StoreHeader'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader user={user} />
      <main>{children}</main>
      <footer className="bg-gray-900 text-gray-400 text-sm py-10 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
