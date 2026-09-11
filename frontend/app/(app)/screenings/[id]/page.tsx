"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { screeningsApi } from "@/lib/api"
import { useParams } from "next/navigation"
import { useState } from "react"
import { motion } from "framer-motion"
import {
  Brain, Eye, Stethoscope, AlertTriangle, CheckCircle,
  Camera, RefreshCw, Loader2, FileText
} from "lucide-react"
import { cn, DR_GRADE_LABELS, DR_GRADE_COLORS, DR_GRADE_BG,
         ASSURANCE_COLORS, formatConfidence, formatDate } from "@/lib/utils"
import { useAuthStore } from "@/lib/store"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function ScreeningDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [doctorGrade, setDoctorGrade] = useState<number | null>(null)
  const [doctorNotes, setDoctorNotes] = useState("")
  const [aiAccepted, setAiAccepted] = useState(true)

  const { data: screening, isLoading } = useQuery({
    queryKey: ["screening", id],
    queryFn: () => screeningsApi.get(id).then(r => r.data),
  })

  const analyzeMutation = useMutation({
    mutationFn: () => screeningsApi.analyze(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["screening", id] }),
  })

  const reviewMutation = useMutation({
    mutationFn: () => screeningsApi.doctorReview(id, {
      doctor_grade: doctorGrade,
      doctor_notes: doctorNotes,
      ai_grade_accepted: aiAccepted,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["screening", id] }),
  })

  const recaptureMutation = useMutation({
    mutationFn: () => screeningsApi.recapture(id, "Recapture requested by operator"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["screening", id] }),
  })

  if (isLoading) return <div className="text-cyan-400 animate-pulse p-8">Loading screening...</div>
  if (!screening) return <div className="text-red-400 p-8">Screening not found.</div>

  const pred = (screening as any).prediction
  const quality = (screening as any).quality
  const isDoctor = user?.role === "OPHTHALMOLOGIST" || user?.role === "ADMIN"

  const assuranceColor = {
    VALIDATED: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    HUMAN_REVIEW_REQUIRED: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
    RECAPTURE_REQUIRED: "text-red-400 border-red-500/40 bg-red-500/10",
  }[screening.assurance_decision as string] ?? "text-slate-400 border-slate-500/40 bg-slate-500/10"

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Screening Detail</h1>
          <p className="text-slate-400 text-xs mt-1 font-mono">{id}</p>
        </div>
        <div className="flex items-center gap-3">
          {screening.assurance_decision && (
            <span className={cn("text-xs font-bold px-3 py-1.5 rounded-lg border", assuranceColor)}>
              {screening.assurance_decision.replace(/_/g, " ")}
            </span>
          )}
          <span className="text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            {screening.status}
          </span>
        </div>
      </div>

      {/* Demo warning */}
      {pred?.is_demo && (
        <div className="demo-banner px-4 py-2 rounded-lg text-xs text-yellow-300">
          MODEL STATUS: {pred.model_status} — Results below are NOT from a trained clinical model.
          AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS.
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* Prediction card */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-cyan-400" /> AI Prediction
            </h2>
            {pred ? (
              <>
                <div className={cn("px-4 py-3 rounded-lg border", DR_GRADE_BG[pred.predicted_grade ?? 0])}>
                  <p className="text-xs text-slate-400 mb-1">Predicted Grade</p>
                  <p className={cn("text-2xl font-bold", DR_GRADE_COLORS[pred.predicted_grade ?? 0])}>
                    {pred.predicted_grade !== null
                      ? `Grade ${pred.predicted_grade} — ${DR_GRADE_LABELS[pred.predicted_grade]}`
                      : "NOT AVAILABLE"}
                  </p>
                  {pred.confidence && (
                    <p className="text-sm text-slate-300 mt-1">
                      Confidence: {formatConfidence(pred.confidence)}
                    </p>
                  )}
                </div>

                {/* Probability bars */}
                {pred.probabilities && (
                  <div className="space-y-2">
                    {Object.entries(pred.probabilities).map(([g, p]: any) => (
                      <div key={g} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-24 shrink-0">
                          Grade {g} — {DR_GRADE_LABELS[Number(g)]}
                        </span>
                        <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all",
                              Number(g) === pred.predicted_grade ? "bg-cyan-400" : "bg-white/20")}
                            style={{ width: `${p * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-10 text-right font-mono">
                          {(p * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-slate-500">Model</p>
                    <p className="text-slate-300">{pred.model_name}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-slate-500">Status</p>
                    <p className="text-yellow-400">{pred.model_status}</p>
                  </div>
                </div>

                {/* Referral */}
                {pred.is_referable !== null && pred.is_referable !== undefined && (
                  <div className={cn("px-3 py-2 rounded-lg text-xs font-semibold",
                    pred.is_referable
                      ? "bg-red-500/10 border border-red-500/30 text-red-400"
                      : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  )}>
                    {pred.is_referable ? "⚠ REFERABLE DR — Refer to Eye Specialist" : "✓ NON-REFERABLE DR"}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm">No prediction yet.</p>
                {screening.status === "IMAGE_UPLOADED" && (
                  <button onClick={() => analyzeMutation.mutate()}
                    disabled={analyzeMutation.isPending}
                    className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm mx-auto hover:bg-cyan-500/30 transition-colors">
                    {analyzeMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                      : <><Brain className="w-4 h-4" /> Run Analysis</>}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Evidence */}
          {pred?.lesion_summary && (
            <div className="glass-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" /> Lesion Evidence
              </h2>
              <p className="text-xs text-slate-500 italic">{pred.lesion_summary.disclaimer}</p>
              {[
                { key: "microaneurysms", label: "Microaneurysm candidates", color: "text-yellow-400" },
                { key: "hemorrhages",    label: "Hemorrhage candidates",     color: "text-red-400" },
                { key: "hard_exudates", label: "Exudate candidates",        color: "text-orange-400" },
              ].map(({ key, label, color }) => {
                const item = pred.lesion_summary[key]
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className={cn("text-sm font-mono font-bold", color)}>{item?.count ?? 0}</span>
                  </div>
                )
              })}
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Evidence score</span>
                  <span className="text-cyan-400 font-mono">
                    {((pred.lesion_summary.lesion_evidence_score ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-slate-400">Concordance</span>
                  <span className={cn("font-semibold",
                    pred.concordance_level === "HIGH" ? "text-emerald-400" :
                    pred.concordance_level === "MODERATE" ? "text-yellow-400" : "text-red-400"
                  )}>
                    {pred.concordance_level ?? "UNKNOWN"}
                  </span>
                </div>
              </div>
              {pred.mismatch_detected && (
                <div className="px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
                  ⚠ GRADE–LESION MISMATCH DETECTED — Human review required
                </div>
              )}
              <p className="text-xs text-slate-600">Provenance: {pred.lesion_summary.provenance}</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          {/* Grad-CAM */}
          {pred?.gradcam_path && (
            <div className="glass-card p-4">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" /> Grad-CAM Explanation
              </h2>
              <img
                src={`${API_BASE}/${pred.gradcam_path}`}
                alt="Grad-CAM heatmap"
                className="w-full rounded-lg"
              />
              <p className="text-xs text-slate-500 mt-2">
                Target layer: {pred.gradcam_target_layer} · Grade {pred.predicted_grade}
              </p>
            </div>
          )}

          {/* Quality */}
          {quality && (
            <div className="glass-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">Image Quality</h2>
              {[
                { label: "Overall", val: quality.quality_score },
                { label: "Focus", val: quality.focus_score },
                { label: "Illumination", val: quality.illumination_score },
                { label: "FOV", val: quality.fov_score },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-20 shrink-0">{label}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className={cn("h-full rounded-full",
                      Number(val) >= 70 ? "bg-emerald-400" :
                      Number(val) >= 50 ? "bg-yellow-400" : "bg-red-400")}
                      style={{ width: `${val}%` }} />
                  </div>
                  <span className="text-xs font-mono text-slate-300 w-8 text-right">{Number(val).toFixed(0)}</span>
                </div>
              ))}
              <p className="text-xs text-slate-400">{quality.feedback}</p>
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                quality.is_gradable ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10")}>
                {quality.is_gradable ? "GRADABLE" : "UNGRADABLE"}
              </span>
            </div>
          )}

          {/* Assurance reasons */}
          {screening.assurance_reasons?.length > 0 && (
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Assurance Reasons</h2>
              <ul className="space-y-1.5">
                {screening.assurance_reasons.map((r: string, i: number) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-cyan-500 mt-0.5 shrink-0">•</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Referral priority */}
          {screening.referral_priority && (
            <div className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Referral Priority</p>
                <p className={cn("text-lg font-bold",
                  screening.referral_priority === "CRITICAL" ? "text-red-400" :
                  screening.referral_priority === "HIGH" ? "text-orange-400" :
                  screening.referral_priority === "MEDIUM" ? "text-yellow-400" : "text-emerald-400"
                )}>{screening.referral_priority}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Score</p>
                <p className="text-2xl font-bold text-white">{screening.referral_score?.toFixed(0) ?? "—"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Doctor Review Form */}
      {isDoctor && screening.status !== "REVIEWED" && pred && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-purple-400" /> Ophthalmologist Review
          </h2>
          <p className="text-xs text-slate-400">
            Doctor assessment stored separately from AI prediction. Your grade is the authoritative record.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-2">Doctor Grade</label>
              <div className="grid grid-cols-5 gap-2">
                {[0,1,2,3,4].map(g => (
                  <button key={g} onClick={() => setDoctorGrade(g)}
                    className={cn("py-2 rounded-lg text-sm font-bold border transition-colors",
                      doctorGrade === g
                        ? cn(DR_GRADE_BG[g], DR_GRADE_COLORS[g])
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    )}>
                    {g}
                  </button>
                ))}
              </div>
              {doctorGrade !== null && (
                <p className="text-xs text-slate-300 mt-1">{DR_GRADE_LABELS[doctorGrade]}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-2">Accept AI Grade?</label>
              <div className="flex gap-2">
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => setAiAccepted(v)}
                    className={cn("flex-1 py-2 rounded-lg text-sm border transition-colors",
                      aiAccepted === v
                        ? v ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                             : "bg-red-500/20 border-red-500/40 text-red-400"
                        : "bg-white/5 border-white/10 text-slate-400"
                    )}>
                    {v ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Clinical Notes</label>
            <textarea value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)}
              rows={3} placeholder="Add clinical observations..."
              className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => reviewMutation.mutate()}
              disabled={doctorGrade === null || reviewMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-50">
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Submit Review
            </button>
            <button onClick={() => recaptureMutation.mutate()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 text-sm hover:bg-orange-500/30 transition-colors">
              <Camera className="w-4 h-4" /> Request Recapture
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-600 text-center">
        AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS
      </p>
    </div>
  )
}
