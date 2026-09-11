"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi, patientsApi, api } from "@/lib/api"
import { cn, DR_GRADE_LABELS, PRIORITY_COLORS, formatDate } from "@/lib/utils"
import { motion } from "framer-motion"
import dynamic from "next/dynamic"
import {
  Users, Scan, AlertTriangle, UserCheck,
  Camera, TrendingUp, Activity, Brain
} from "lucide-react"

const NetworkGraph3D = dynamic(
  () => import("@/components/NetworkGraph3D").then(m => m.NetworkGraph3D),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-xl" /> }
)

import type { LucideIcon } from "lucide-react"

function NetworkGraph3DWrapper() {
  const { data: patients } = useQuery({
    queryKey: ["patients-for-graph"],
    queryFn: () => patientsApi.list({ limit: 150 }).then(r => r.data),
  })
  return <NetworkGraph3D data={patients ?? []} />
}

function StatCard({
  title, value, icon: Icon, color, subtitle
}: {
  title: string; value: number | string; icon: LucideIcon
  color: string; subtitle?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <p className={cn("text-3xl font-bold", color)}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-2.5 rounded-lg bg-white/10">
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.statistics().then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get("/api/health").then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: queue } = useQuery({
    queryKey: ["referral-queue"],
    queryFn: () => dashboardApi.referralQueue({ limit: 10 }).then(r => r.data),
  })

  const modelStatus: string = health?.model_status ?? "CHECKING..."
  const isDemo: boolean = health?.demo_mode ?? true

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyan-400 animate-pulse flex items-center gap-3">
          <Activity className="w-5 h-5" />
          Loading dashboard...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-6 border-red-500/30">
        <p className="text-red-400">Failed to load dashboard. Is the backend running?</p>
        <p className="text-slate-400 text-sm mt-1">
          Start backend: <code className="text-cyan-400">uvicorn app.main:app --reload</code>
        </p>
      </div>
    )
  }

  const statCards = [
    { title: "Total Patients", value: stats?.total_patients ?? 0, icon: Users, color: "text-cyan-400" },
    { title: "Total Screenings", value: stats?.total_screenings ?? 0, icon: Scan, color: "text-blue-400" },
    { title: "Critical Cases", value: stats?.critical_cases ?? 0, icon: AlertTriangle, color: "text-red-400" },
    { title: "Human Review", value: stats?.human_review_required ?? 0, icon: UserCheck, color: "text-yellow-400" },
    { title: "Recapture Required", value: stats?.recapture_required ?? 0, icon: Camera, color: "text-orange-400" },
    { title: "Referable DR", value: stats?.referable_cases ?? 0, icon: TrendingUp, color: "text-purple-400" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Command <span className="gradient-text">Overview</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Real-time screening status across all facilities
        </p>
      </div>

      {/* Model Status Banner — reads from live /api/health */}
      <div className={cn(
        "glass-card px-4 py-3 flex items-center gap-3 border",
        modelStatus === "TRAINED" || modelStatus === "VALIDATED"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-yellow-500/30 bg-yellow-500/5"
      )}>
        <Brain className={cn("w-4 h-4 shrink-0",
          modelStatus === "TRAINED" || modelStatus === "VALIDATED"
            ? "text-emerald-400" : "text-yellow-400")} />
        <div className="text-sm flex flex-wrap items-center gap-2">
          <span className={cn("font-semibold",
            modelStatus === "TRAINED" || modelStatus === "VALIDATED"
              ? "text-emerald-400" : "text-yellow-400")}>
            MODEL STATUS: {modelStatus}
          </span>
          {(modelStatus === "TRAINED" || modelStatus === "VALIDATED") ? (
            <span className="text-slate-400">
              — Real EfficientNet-B0 · ROC-AUC 98.2% · Specificity 96.1%
              {isDemo && <span className="text-yellow-400 ml-2">⚠ Demo mode still active in config</span>}
            </span>
          ) : (
            <span className="text-slate-400">
              — Train: <code className="text-cyan-400">python3 -u training/train_efficientnet.py</code>
            </span>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* 3D Patient Network */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          Patient Risk Network
          <span className="text-xs text-slate-500 font-normal ml-1">
            — Node size = screening count · Colour = DR grade · Pulse = high risk
          </span>
        </h2>
        <NetworkGraph3DWrapper />
      </div>

      {/* Referral Queue Preview */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Priority Referral Queue
        </h2>        {!queue || queue.length === 0 ? (
          <p className="text-slate-500 text-sm">No pending referrals.</p>
        ) : (
          <div className="space-y-2">
            {queue.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded border",
                    item.referral_priority === "CRITICAL"
                      ? "text-red-400 border-red-500/40 bg-red-500/10"
                      : item.referral_priority === "HIGH"
                      ? "text-orange-400 border-orange-500/40 bg-orange-500/10"
                      : "text-yellow-400 border-yellow-500/40 bg-yellow-500/10"
                  )}>
                    {item.referral_priority}
                  </span>
                  <span className="text-xs text-slate-400">
                    Score: {item.referral_score?.toFixed(0)}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {formatDate(item.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-600 text-center">
        AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS
      </p>
    </div>
  )
}
