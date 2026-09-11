"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function DemoBanner() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get("/api/health").then(r => r.data),
    staleTime: 60_000,
  })

  const isDemo  = health?.demo_mode ?? true
  const status  = health?.model_status ?? "CHECKING"

  if (!isDemo && (status === "TRAINED" || status === "VALIDATED")) return null

  return (
    <div className="demo-banner px-4 py-2 text-center text-xs font-semibold text-yellow-300 tracking-widest uppercase">
      {status === "CHECKING" || status === "NOT_TRAINED"
        ? "⚠ MODEL NOT TRAINED — DEMO ONLY — AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS"
        : "⚠ AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS — OPHTHALMOLOGIST REVIEW REQUIRED"
      }
    </div>
  )
}
