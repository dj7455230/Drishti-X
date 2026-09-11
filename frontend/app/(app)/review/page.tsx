"use client"
import { useQuery } from "@tanstack/react-query"
import { screeningsApi } from "@/lib/api"
import Link from "next/link"
import { Stethoscope, ChevronRight } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

export default function ReviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["screenings-review"],
    queryFn: () => screeningsApi.list({ status: "HUMAN_REVIEW_REQUIRED", limit: 50 }).then(r => r.data),
  })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Stethoscope className="w-6 h-6 text-purple-400" />
          Doctor <span className="gradient-text">Review Queue</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">Cases requiring ophthalmologist review</p>
      </div>
      {isLoading ? (
        <div className="text-cyan-400 animate-pulse py-8 text-center">Loading...</div>
      ) : (data ?? []).length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Stethoscope className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No cases pending review.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((s: any) => (
            <Link key={s.id} href={`/screenings/${s.id}`}
              className="glass-card px-5 py-4 flex items-center gap-4 hover:border-purple-500/30 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-slate-300 truncate">{s.id.slice(0, 22)}...</p>
                <p className="text-xs text-slate-500">{formatDate(s.created_at)}</p>
              </div>
              <span className="text-xs text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 rounded">
                HUMAN REVIEW REQUIRED
              </span>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
