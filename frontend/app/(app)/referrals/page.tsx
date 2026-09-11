"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/lib/api"
import { motion } from "framer-motion"
import { Send, AlertTriangle, ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn, formatDate, PRIORITY_COLORS } from "@/lib/utils"

const PRIORITY_BG: Record<string, string> = {
  CRITICAL: "border-red-500/40 bg-red-500/5",
  HIGH:     "border-orange-500/40 bg-orange-500/5",
  MEDIUM:   "border-yellow-500/40 bg-yellow-500/5",
  LOW:      "border-white/10 bg-white/5",
}

export default function ReferralsPage() {
  const { data: queue, isLoading } = useQuery({
    queryKey: ["referral-queue-full"],
    queryFn: () => dashboardApi.referralQueue({ limit: 100, sort_by: "referral_score" }).then(r => r.data),
    refetchInterval: 20_000,
  })

  const grouped = {
    CRITICAL: (queue ?? []).filter((r: any) => r.referral_priority === "CRITICAL"),
    HIGH:     (queue ?? []).filter((r: any) => r.referral_priority === "HIGH"),
    MEDIUM:   (queue ?? []).filter((r: any) => r.referral_priority === "MEDIUM"),
    LOW:      (queue ?? []).filter((r: any) => r.referral_priority === "LOW"),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Send className="w-6 h-6 text-cyan-400" />
          Referral <span className="gradient-text">Queue</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Priority-sorted referral queue for ophthalmologist review.
          Sorted by AI risk score — not autonomous diagnosis.
        </p>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-4 gap-3">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(p => (
          <div key={p} className={cn("glass-card p-4 border text-center", PRIORITY_BG[p])}>
            <p className="text-xs text-slate-400 mb-1">{p}</p>
            <p className={cn("text-3xl font-bold", PRIORITY_COLORS[p])}>
              {grouped[p].length}
            </p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="text-cyan-400 animate-pulse py-8 text-center">Loading referral queue...</div>
      ) : (queue ?? []).length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Send className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No pending referrals.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(priority => {
            const items = grouped[priority]
            if (items.length === 0) return null
            return (
              <div key={priority}>
                <h2 className={cn("text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2", PRIORITY_COLORS[priority])}>
                  {priority === "CRITICAL" && <AlertTriangle className="w-3.5 h-3.5" />}
                  {priority} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map((item: any, i: number) => (
                    <motion.div key={item.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}>
                      <Link href={`/screenings/${item.id}`}
                        className={cn(
                          "glass-card px-5 py-4 flex items-center gap-4 group hover:border-cyan-500/30 transition-colors border",
                          PRIORITY_BG[priority]
                        )}>
                        {/* Priority badge */}
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0",
                          PRIORITY_COLORS[priority],
                          priority === "CRITICAL" ? "bg-red-500/15" :
                          priority === "HIGH"     ? "bg-orange-500/15" :
                          priority === "MEDIUM"   ? "bg-yellow-500/15" : "bg-white/5"
                        )}>
                          {item.referral_score?.toFixed(0) ?? "—"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-slate-300 truncate">{item.id.slice(0, 18)}...</p>
                          <p className="text-xs text-slate-500">{item.status?.replace(/_/g, " ")}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs text-slate-500">{formatDate(item.created_at)}</p>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-slate-600 text-center">
        AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS —
        Referral priority is a triage aid, not autonomous diagnosis
      </p>
    </div>
  )
}
