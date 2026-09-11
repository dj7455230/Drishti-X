"use client"

import { useQuery } from "@tanstack/react-query"
import { screeningsApi } from "@/lib/api"
import { useState } from "react"
import { motion } from "framer-motion"
import { Scan, Search, ChevronRight, Filter } from "lucide-react"
import Link from "next/link"
import { cn, formatDate, ASSURANCE_COLORS } from "@/lib/utils"

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "HUMAN_REVIEW_REQUIRED", label: "Human Review" },
  { value: "RECAPTURE_REQUIRED", label: "Recapture" },
  { value: "ANALYZED", label: "Analyzed" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "IMAGE_UPLOADED", label: "Uploaded" },
]

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "text-red-400 bg-red-500/10 border-red-500/30",
  HIGH:     "text-orange-400 bg-orange-500/10 border-orange-500/30",
  MEDIUM:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  LOW:      "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
}

export default function ScreeningsPage() {
  const [statusFilter, setStatusFilter] = useState("")

  const { data: screenings, isLoading } = useQuery({
    queryKey: ["screenings", statusFilter],
    queryFn: () => screeningsApi.list({
      limit: 100,
      ...(statusFilter ? { status: statusFilter } : {}),
    }).then(r => r.data),
    refetchInterval: 20_000,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            <span className="gradient-text">Screenings</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {screenings?.length ?? 0} screenings
          </p>
        </div>
        <Link href="/screenings/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors">
          <Scan className="w-4 h-4" /> New Screening
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500" />
        {STATUS_OPTIONS.map(opt => (
          <button key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs border transition-colors",
              statusFilter === opt.value
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            )}>
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-cyan-400 animate-pulse py-8 text-center">Loading screenings...</div>
      ) : (screenings ?? []).length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Scan className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No screenings found.</p>
          <Link href="/screenings/new" className="text-cyan-400 text-sm hover:underline mt-2 inline-block">
            Start a new screening →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {(screenings ?? []).map((s: any, i: number) => (
            <motion.div key={s.id}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}>
              <Link href={`/screenings/${s.id}`}
                className="glass-card px-5 py-4 flex items-center gap-4 hover:border-cyan-500/30 transition-colors group">

                {/* Status dot */}
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0",
                  s.status === "REVIEWED" ? "bg-emerald-400" :
                  s.status === "HUMAN_REVIEW_REQUIRED" ? "bg-yellow-400" :
                  s.status === "RECAPTURE_REQUIRED" ? "bg-red-400" :
                  s.status === "ANALYZED" ? "bg-cyan-400" : "bg-slate-500"
                )} />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-slate-300 truncate">
                    {s.id.slice(0, 24)}...
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(s.created_at)}</p>
                </div>

                {/* Status badge */}
                <span className={cn("text-xs px-2 py-0.5 rounded border shrink-0 hidden sm:inline",
                  s.status === "REVIEWED" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                  s.status === "HUMAN_REVIEW_REQUIRED" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" :
                  s.status === "RECAPTURE_REQUIRED" ? "text-red-400 border-red-500/30 bg-red-500/10" :
                  s.status === "ANALYZED" ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" :
                  "text-slate-400 border-slate-500/30"
                )}>
                  {s.status?.replace(/_/g, " ")}
                </span>

                {/* Referral priority */}
                {s.referral_priority && s.referral_priority !== "LOW" && (
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded border shrink-0",
                    PRIORITY_COLOR[s.referral_priority] ?? "text-slate-400"
                  )}>
                    {s.referral_priority}
                  </span>
                )}

                {/* Referable tag */}
                {s.is_referable && (
                  <span className="text-xs text-red-400 font-semibold shrink-0">REFERABLE</span>
                )}

                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
