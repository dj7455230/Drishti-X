"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import { Sidebar } from "@/components/Sidebar"
import { DemoBanner } from "@/components/DemoBanner"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-[#f4f8f8]">

      <Sidebar />

      <div className="min-h-screen lg:pl-[272px]">

        {/* Existing demo/model status banner */}
        <DemoBanner />

        {/* Main clinical workspace */}
        <main className="min-h-screen">
          <div className="mx-auto w-full max-w-[1600px] px-5 py-6 sm:px-7 lg:px-8">
            {children}
          </div>
        </main>

      </div>
    </div>
  )
}