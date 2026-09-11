"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import {
  ShieldCheck,
  CircleAlert,
  FlaskConical,
} from "lucide-react"

export function DemoBanner() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () =>
      api.get("/api/health").then((r) => r.data),
    staleTime: 60_000,
  })

  const isDemo = health?.demo_mode ?? true
  const status = health?.model_status ?? "CHECKING"

  const modelReady =
    status === "TRAINED" || status === "VALIDATED"

  // Fully production-ready state → no banner needed
  if (!isDemo && modelReady) return null

  return (
    <div className="border-b border-[#dce7e7] bg-[#fbfdfc]">
      <div className="mx-auto flex min-h-[46px] max-w-[1600px] flex-col justify-between gap-2 px-5 py-2.5 sm:flex-row sm:items-center sm:px-7 lg:px-8">

        {/* Left status */}
        <div className="flex items-center gap-3">

          <div
            className={
              modelReady
                ? "flex h-7 w-7 items-center justify-center rounded-full bg-[#e8f5ef]"
                : "flex h-7 w-7 items-center justify-center rounded-full bg-[#fff5df]"
            }
          >
            {modelReady ? (
              <ShieldCheck className="h-3.5 w-3.5 text-[#39745d]" />
            ) : (
              <FlaskConical className="h-3.5 w-3.5 text-[#a37428]" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">

            <span className="text-[11px] font-semibold text-[#405a63]">
              {isDemo
                ? "Demo Environment"
                : "Clinical Environment"}
            </span>

            <span className="hidden text-[#bcc6c8] sm:inline">
              •
            </span>

            <span className="text-[10px] text-[#829197]">
              {status === "CHECKING"
                ? "Checking screening engine..."
                : modelReady
                ? "Screening engine available"
                : "Model weights unavailable locally"}
            </span>

          </div>
        </div>

        {/* Right clinical note */}
        <div className="flex items-center gap-2 text-[10px] text-[#87959a]">

          <CircleAlert className="h-3.5 w-3.5 shrink-0 text-[#799398]" />

          <span>
            AI-assisted screening
            <span className="mx-1.5 text-[#c2cbcd]">
              •
            </span>
            Clinical review remains authoritative
          </span>

        </div>
      </div>
    </div>
  )
}