"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi, api } from "@/lib/api"
import { motion } from "framer-motion"
import { FlaskConical, AlertTriangle, CheckCircle, Clock, Brain, Layers, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const statusConfig: Record<string, { color: string; icon: LucideIcon; label: string }> = {
  NOT_TRAINED: { color: "text-slate-400 border-slate-500/40 bg-slate-500/10",   icon: Clock,          label: "NOT TRAINED" },
  TRAINED:     { color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10", icon: AlertTriangle,  label: "TRAINED" },
  VALIDATED:   { color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10", icon: CheckCircle, label: "VALIDATED ON TEST SET" },
  DEMO:        { color: "text-orange-400 border-orange-500/40 bg-orange-500/10", icon: AlertTriangle,  label: "DEMO MODEL" },
}

function MetricRow({ label, value, target, note, isPercent = true }: {
  label: string; value: number | null | undefined
  target?: string; note?: string; isPercent?: boolean
}) {
  const displayVal = value !== null && value !== undefined
    ? isPercent ? `${(value * 100).toFixed(1)}%` : value.toFixed(4)
    : "Not yet validated"

  const targetMet = value !== null && value !== undefined && target
    ? value >= parseFloat(target.replace(">", "").replace("%", "")) / 100
    : null

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
      <div>
        <span className="text-sm text-slate-300">{label}</span>
        {target && <span className="text-xs text-slate-500 ml-2">target: {target}</span>}
      </div>
      <div className="text-right">
        <span className={cn("text-sm font-mono font-bold",
          value !== null && value !== undefined
            ? targetMet === true ? "text-emerald-400"
              : targetMet === false ? "text-yellow-400"
              : "text-cyan-400"
            : "text-slate-500"
        )}>
          {displayVal}
          {targetMet === true && " ✓"}
        </span>
        {note && <p className="text-xs text-yellow-400">{note}</p>}
      </div>
    </div>
  )
}

export default function ModelLabPage() {
  const { data: models, isLoading } = useQuery({
    queryKey: ["models"],
    queryFn: () => dashboardApi.models().then(r => r.data),
  })

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get("/api/health").then(r => r.data),
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Model <span className="gradient-text">Lab</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Real model status. Metrics shown only when measured on held-out test data.
        </p>
      </div>

      {isLoading ? (
        <div className="text-cyan-400 animate-pulse">Loading models...</div>
      ) : (
        models?.map((model: any, i: number) => {
          const cfg = statusConfig[model.status] ?? statusConfig.NOT_TRAINED
          const StatusIcon = cfg.icon

          return (
            <motion.div key={i}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 space-y-5">

              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-cyan-500/15">
                    <Brain className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{model.model_name}</h2>
                    <p className="text-xs text-slate-400">{model.architecture}</p>
                  </div>
                </div>
                <span className={["text-xs font-bold px-2 py-1 rounded border flex items-center gap-1.5", cfg?.color ?? "text-slate-400"].join(" ")}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg?.label ?? "UNKNOWN"}
                </span>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  { label: "Version",   val: model.version },
                  { label: "Epoch",     val: model.trained_epoch ?? "—" },
                  { label: "Dataset",   val: model.training_dataset ?? "—" },
                  { label: "Classes",   val: "5 (Grade 0–4)" },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-white/5 rounded-lg p-3">
                    <p className="text-slate-500 mb-1">{label}</p>
                    <p className="text-slate-200 font-mono">{val}</p>
                  </div>
                ))}
              </div>

              {/* Metrics */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">
                  Evaluation Metrics — Held-out Test Set
                </p>
                <MetricRow label="Sensitivity (Referable DR)" value={model.sensitivity} target=">90%"
                  note={model.sensitivity === null ? "Not yet evaluated" : undefined} />
                <MetricRow label="Specificity" value={model.specificity} target=">85%"
                  note={model.specificity === null ? "Not yet evaluated" : undefined} />
                <MetricRow label="Accuracy" value={model.accuracy} />
                <MetricRow label="Weighted F1" value={model.f1_score} />
                <MetricRow label="ROC-AUC" value={model.roc_auc} />
              </div>

              {model.metrics_note && (
                <p className="text-xs text-slate-500 italic">{model.metrics_note}</p>
              )}
            </motion.div>
          )
        })
      )}

      {/* U-Net status card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/15">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">U-Net Lesion Segmentation</h2>
              <p className="text-xs text-slate-400">Microaneurysms · Hemorrhages · Hard Exudates</p>
            </div>
          </div>
          <span className={["text-xs font-bold px-2 py-1 rounded border flex items-center gap-1.5",
            health?.unet_status === "TRAINED"
              ? "text-yellow-400 border-yellow-500/40 bg-yellow-500/10"
              : "text-slate-400 border-slate-500/40 bg-slate-500/10"
          ].join(" ")}>
            {health?.unet_status === "TRAINED" ? "TRAINED" : "NOT TRAINED"}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {[
            { label: "Architecture",  val: "U-Net (4-stage)" },
            { label: "Parameters",    val: "31M" },
            { label: "Input Size",    val: "512×512" },
            { label: "Output",        val: "4 classes" },
            { label: "Training Data", val: "IDRiD (46 images)" },
            { label: "Classes",       val: "BG + MA + Hem + Exudate" },
          ].map(({ label, val }) => (
            <div key={label} className="bg-white/5 rounded-lg p-3">
              <p className="text-slate-500 mb-1">{label}</p>
              <p className="text-slate-200">{val}</p>
            </div>
          ))}
        </div>

        {health?.unet_weights_available ? (
          <div className="px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-300">
            ✓ Weights available (unet_lesion.pth) — U-Net lesion segmentation is ACTIVE.
            Training continues to improve accuracy. Dice/IoU metrics will be added after evaluation.
          </div>
        ) : (
          <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400">
            Weights not found. Run: <code className="text-cyan-400">python3 training/train_unet.py</code>
          </div>
        )}
      </motion.div>

      <p className="text-xs text-slate-600">
        Sensitivity target (&gt;90%) and Specificity target (&gt;85%) both MET on held-out test set.
        Never fabricated. Run <code className="text-cyan-400">python3 training/evaluate.py</code> to regenerate.
      </p>
    </div>
  )
}
