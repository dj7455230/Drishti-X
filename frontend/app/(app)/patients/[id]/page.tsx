"use client"

import { useQuery } from "@tanstack/react-query"
import { patientsApi, screeningsApi } from "@/lib/api"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Users, Scan, Plus, ChevronRight, TrendingUp } from "lucide-react"
import { cn, DR_GRADE_LABELS, DR_GRADE_COLORS, DR_GRADE_BG, formatDate } from "@/lib/utils"

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => patientsApi.get(id).then(r => r.data),
  })

  const { data: screenings } = useQuery({
    queryKey: ["patient-screenings", id],
    queryFn: () => screeningsApi.list({ limit: 50 }).then(r =>
      r.data.filter((s: any) => s.patient_id === id)
    ),
    enabled: !!id,
  })

  if (isLoading) return <div className="text-cyan-400 animate-pulse p-8">Loading patient...</div>
  if (!patient) return <div className="text-red-400 p-8">Patient not found.</div>

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
              {patient.patient_code?.slice(-2)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white font-mono">{patient.patient_code}</h1>
              <p className="text-slate-400 text-sm">
                {[patient.age && `Age ${patient.age}`, patient.gender,
                  patient.district, patient.state].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </div>
        <Link href={`/screenings/new?patient_id=${patient.id}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors">
          <Plus className="w-4 h-4" /> New Screening
        </Link>
      </div>

      {/* Patient info */}
      <div className="glass-card p-5 grid grid-cols-2 gap-4 text-sm">
        {[
          { label: "Patient Code", val: patient.patient_code },
          { label: "Age", val: patient.age ?? "—" },
          { label: "Gender", val: patient.gender ?? "—" },
          { label: "Diabetes Duration", val: patient.diabetes_duration_years ? `${patient.diabetes_duration_years} years` : "—" },
          { label: "District", val: patient.district ?? "—" },
          { label: "State", val: patient.state ?? "—" },
          { label: "Registered", val: formatDate(patient.created_at) },
          { label: "Total Screenings", val: patient.screening_count ?? 0 },
        ].map(({ label, val }) => (
          <div key={label}>
            <p className="text-xs text-slate-500 mb-0.5">{label}</p>
            <p className="text-slate-200">{val}</p>
          </div>
        ))}
      </div>

      {/* Latest DR grade */}
      {patient.latest_dr_grade !== null && patient.latest_dr_grade !== undefined && (
        <div className={cn("glass-card p-4 border flex items-center gap-4", DR_GRADE_BG[patient.latest_dr_grade])}>
          <TrendingUp className={cn("w-5 h-5", DR_GRADE_COLORS[patient.latest_dr_grade])} />
          <div>
            <p className="text-xs text-slate-400">Latest DR Grade</p>
            <p className={cn("text-lg font-bold", DR_GRADE_COLORS[patient.latest_dr_grade])}>
              Grade {patient.latest_dr_grade} — {DR_GRADE_LABELS[patient.latest_dr_grade]}
            </p>
          </div>
          {patient.latest_dr_grade >= 2 && (
            <span className="ml-auto text-xs font-bold text-red-400 border border-red-500/40 bg-red-500/10 px-2 py-1 rounded">
              REFERABLE
            </span>
          )}
        </div>
      )}

      {/* Screening history */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Scan className="w-4 h-4 text-cyan-400" />
          Screening History ({screenings?.length ?? 0})
        </h2>
        {!screenings || screenings.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-slate-400 text-sm">No screenings yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {screenings.map((s: any, i: number) => (
              <motion.div key={s.id}
                initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}>
                <Link href={`/screenings/${s.id}`}
                  className="glass-card px-5 py-4 flex items-center gap-4 hover:border-cyan-500/30 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-400 truncate">{s.id.slice(0, 20)}...</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(s.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded border",
                      s.status === "REVIEWED" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                      s.status === "HUMAN_REVIEW_REQUIRED" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" :
                      s.status === "RECAPTURE_REQUIRED" ? "text-red-400 border-red-500/30 bg-red-500/10" :
                      "text-slate-400 border-slate-500/30 bg-slate-500/10"
                    )}>
                      {s.status?.replace(/_/g, " ")}
                    </span>
                    {s.referral_priority && s.referral_priority !== "LOW" && (
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                        s.referral_priority === "CRITICAL" ? "text-red-400 bg-red-500/10" :
                        s.referral_priority === "HIGH" ? "text-orange-400 bg-orange-500/10" :
                        "text-yellow-400 bg-yellow-500/10"
                      )}>
                        {s.referral_priority}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600 text-center">
        AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS
      </p>
    </div>
  )
}
