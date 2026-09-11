"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import { Sidebar } from "@/components/Sidebar"
import { DemoBanner } from "@/components/DemoBanner"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen flex flex-col">
      <DemoBanner />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
