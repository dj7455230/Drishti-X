"use client"

import { useQuery } from "@tanstack/react-query"
import { patientsApi } from "@/lib/api"
import { motion } from "framer-motion"
import { Users, Plus, Search, ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn, DR_GRADE_LABELS, DR_GRADE_COLORS, formatDate } from "@/lib/utils"
import { useState } from "react"

export default function PatientsPage() {
  const [search, setSearch] = useState("")
  const { data: patients, isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientsApi.list({ limit: 100 }).then(r => r.data),
    refetchInterval: 30_000,
  })

  const filtered = patients?.filter((p: any) =>
    !search || p.patient_code.toLowerCase().includes(search.toLowerCase()) ||
    p.district?.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            <span className="gradient-text">Patients</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">{patients?.length ?? 0} registered patients</p>
        </div>
        <Link href="/screenings/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors">
          <Plus className="w-4 h-4" /> New Screening
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by patient code or district..."
          className="w-full bg-white/5 border border-white/15 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60" />
      </div>

      {isLoading ? (
        <div className="text-cyan-400 animate-pulse py-8 text-center">Loading patients...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No patients yet.</p>
          <Link href="/screenings/new" className="text-cyan-400 text-sm hover:underline mt-2 inline-block">
            Start a new screening →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p: any, i: number) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}>
              <Link href={`/patients/${p.id}`}
                className="glass-card px-5 py-4 flex items-center gap-4 hover:border-cyan-500/30 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold shrink-0">
                  {p.patient_code.slice(-2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{p.patient_code}</p>
                  <p className="text-xs text-slate-400">
                    {[p.age && `Age ${p.age}`, p.district, p.state].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">{p.screening_count} screening{p.screening_count !== 1 ? "s" : ""}</p>
                  {p.latest_dr_grade !== null && p.latest_dr_grade !== undefined && (
                    <p className={cn("text-xs font-medium", DR_GRADE_COLORS[p.latest_dr_grade])}>
                      {DR_GRADE_LABELS[p.latest_dr_grade]}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
