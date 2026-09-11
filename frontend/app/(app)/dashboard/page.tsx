"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardApi, api } from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import { cn, formatDate } from "@/lib/utils"
import { motion } from "framer-motion"

import {
  Users,
  Scan,
  UserCheck,
  Camera,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Stethoscope,
  ImageIcon,
  Brain,
  Activity,
  ChevronRight,
  CircleCheck,
} from "lucide-react"

import type { LucideIcon } from "lucide-react"

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  helper,
}: {
  label: string
  value: number | string
  icon: LucideIcon
  tone: "navy" | "teal" | "amber" | "red"
  helper: string
}) {
  const tones = {
    navy: {
      icon: "text-[#173f56]",
      box: "bg-[#edf3f5]",
    },
    teal: {
      icon: "text-[#347c7e]",
      box: "bg-[#eaf5f4]",
    },
    amber: {
      icon: "text-[#a56c18]",
      box: "bg-[#fff5df]",
    },
    red: {
      icon: "text-[#b44d4d]",
      box: "bg-[#fff0ef]",
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-2xl border border-[#dde7e7] bg-white p-5 shadow-[0_10px_30px_rgba(38,69,80,0.04)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7d8b91]">
            {label}
          </p>

          <p className="mt-3 text-[32px] font-semibold tracking-[-0.04em] text-[#183746]">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-[#93a0a5]">
            {helper}
          </p>
        </div>

        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            tones[tone].box
          )}
        >
          <Icon className={cn("h-5 w-5", tones[tone].icon)} />
        </div>
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.statistics().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get("/api/health").then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: queue } = useQuery({
    queryKey: ["referral-queue"],
    queryFn: () =>
      dashboardApi.referralQueue({ limit: 6 }).then((r) => r.data),
  })

  const modelStatus = health?.model_status ?? "CHECKING..."
  const modelReady =
    modelStatus === "TRAINED" || modelStatus === "VALIDATED"

  if (isLoading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[#71848b]">
          <Activity className="h-5 w-5 animate-pulse text-[#3b7f83]" />
          Preparing clinical workspace...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-700">
          Clinical dashboard unavailable
        </p>
        <p className="mt-1 text-sm text-red-600">
          Please confirm that the backend service is running.
        </p>
      </div>
    )
  }

  const firstName =
    user?.full_name?.split(" ")[0] || "Clinical User"

  const metrics = [
    {
      label: "Patients Screened",
      value: stats?.total_patients ?? 0,
      icon: Users,
      tone: "navy" as const,
      helper: "Registered screening cases",
    },
    {
      label: "Total Screenings",
      value: stats?.total_screenings ?? 0,
      icon: Scan,
      tone: "teal" as const,
      helper: "Retinal assessments completed",
    },
    {
      label: "Human Review",
      value: stats?.human_review_required ?? 0,
      icon: UserCheck,
      tone: "amber" as const,
      helper: "Awaiting specialist decision",
    },
    {
      label: "Recapture Required",
      value: stats?.recapture_required ?? 0,
      icon: Camera,
      tone: "red" as const,
      helper: "Image quality needs attention",
    },
  ]

  return (
    <div className="space-y-6 pb-10">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#d7e4e4] bg-[#173f56] shadow-[0_18px_50px_rgba(21,58,73,0.12)]">

        <div
          className="absolute inset-y-0 right-0 hidden w-[44%] lg:block"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #173f56 0%, rgba(23,63,86,0.63) 40%, rgba(23,63,86,0.15) 100%), url('/retina-login.png')",
            backgroundSize: "cover",
            backgroundPosition: "center right",
          }}
        />

        <div className="relative z-10 px-7 py-7 lg:px-9 lg:py-8">

          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b9dcdd]">
            <EyeStatusIcon />
            Retinal Screening Workspace
          </div>

          <h1 className="mt-5 max-w-[620px] text-[32px] font-semibold tracking-[-0.04em] text-white lg:text-[38px]">
            Good afternoon, {firstName}.
          </h1>

          <p className="mt-2 max-w-[580px] text-sm leading-6 text-white/65">
            Review retinal screenings, clinical assurance decisions and
            priority referrals from one patient-centred workspace.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="/screenings/new"
              className="group inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-[12px] font-semibold text-[#173f56] transition hover:bg-[#edf6f5]"
            >
              Start retinal screening
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>

            <div className="flex items-center gap-2 text-[11px] text-white/55">
              <ShieldCheck className="h-4 w-4 text-[#8bc1bd]" />
              Evidence-validated clinical support
            </div>
          </div>
        </div>
      </section>

      {/* METRICS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {/* MAIN CLINICAL AREA */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_0.95fr]">

        {/* CLINICAL ASSURANCE */}
        <div className="rounded-[24px] border border-[#dce7e7] bg-white p-6 shadow-[0_10px_30px_rgba(38,69,80,0.04)]">

          <div className="flex items-start justify-between gap-5">

            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#347c7e]" />

                <h2 className="text-[16px] font-semibold text-[#193946]">
                  Clinical Assurance Pathway
                </h2>
              </div>

              <p className="mt-1 text-[12px] text-[#839197]">
                Each screening passes through independent evidence checks before clinical action.
              </p>
            </div>

            <span
              className={cn(
                "rounded-full px-3 py-1.5 text-[10px] font-semibold",
                modelReady
                  ? "bg-[#eaf5ef] text-[#39745d]"
                  : "bg-[#fff5df] text-[#94651f]"
              )}
            >
              {modelReady ? "AI ENGINE READY" : "DEMO MODE"}
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-4">

            <AssuranceStep
              number="01"
              icon={ImageIcon}
              title="Image Quality"
              description="Blur, illumination and retinal visibility"
            />

            <AssuranceStep
              number="02"
              icon={Brain}
              title="DR Prediction"
              description="Grade and confidence assessment"
            />

            <AssuranceStep
              number="03"
              icon={ShieldCheck}
              title="Evidence Check"
              description="Lesions and explainability concordance"
            />

            <AssuranceStep
              number="04"
              icon={Stethoscope}
              title="Clinical Action"
              description="Validate, review or recapture"
            />

          </div>

          <div className="mt-6 rounded-2xl border border-[#dbe9e8] bg-[#f2f8f7] px-5 py-4">

            <div className="flex items-start gap-3">

              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#3e8580]" />

              <div>
                <p className="text-[12px] font-semibold text-[#31545b]">
                  Why this matters
                </p>

                <p className="mt-1 text-[11px] leading-5 text-[#718388]">
                  A prediction is not treated as clinically actionable until
                  image quality, model confidence and retinal evidence are
                  checked together.
                </p>
              </div>

            </div>

          </div>
        </div>

        {/* PRIORITY QUEUE */}
        <div className="rounded-[24px] border border-[#dce7e7] bg-white shadow-[0_10px_30px_rgba(38,69,80,0.04)]">

          <div className="border-b border-[#edf1f1] px-6 py-5">

            <div className="flex items-center justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#b45353]" />

                  <h2 className="text-[15px] font-semibold text-[#193946]">
                    Priority Review
                  </h2>
                </div>

                <p className="mt-1 text-[11px] text-[#8a989d]">
                  Cases needing faster specialist attention
                </p>
              </div>

              <a
                href="/referrals"
                className="flex items-center gap-1 text-[11px] font-semibold text-[#34757a]"
              >
                View queue
                <ChevronRight className="h-3.5 w-3.5" />
              </a>

            </div>

          </div>

          <div className="p-5">

            {!queue || queue.length === 0 ? (
              <div className="flex min-h-[270px] flex-col items-center justify-center text-center">

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf6f3]">
                  <ShieldCheck className="h-5 w-5 text-[#47816d]" />
                </div>

                <p className="mt-4 text-[12px] font-semibold text-[#41575f]">
                  No priority referrals
                </p>

                <p className="mt-1 max-w-[220px] text-[11px] leading-5 text-[#93a0a5]">
                  High-risk and uncertain screening cases will appear here.
                </p>

              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((item: any) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#e6eded] bg-[#fbfdfc] p-4 transition hover:border-[#cfdede]"
                  >
                    <div className="flex items-center justify-between gap-3">

                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[9px] font-bold tracking-wide",
                          item.referral_priority === "CRITICAL"
                            ? "bg-[#fff0ef] text-[#b44d4d]"
                            : item.referral_priority === "HIGH"
                            ? "bg-[#fff4e6] text-[#a56920]"
                            : "bg-[#fff8df] text-[#8c731f]"
                        )}
                      >
                        {item.referral_priority}
                      </span>

                      <span className="text-[10px] text-[#98a5a9]">
                        {formatDate(item.created_at)}
                      </span>

                    </div>

                    <div className="mt-4 flex items-center justify-between">

                      <span className="text-[10px] text-[#839197]">
                        Referral score
                      </span>

                      <span className="text-[13px] font-semibold text-[#294853]">
                        {item.referral_score?.toFixed(0) ?? "—"}
                      </span>

                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </section>

      {/* SYSTEM STATUS */}
      <section className="flex flex-col justify-between gap-3 rounded-2xl border border-[#dfe8e8] bg-[#fbfdfc] px-5 py-4 sm:flex-row sm:items-center">

        <div className="flex items-center gap-3">

          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              modelReady
                ? "bg-[#4b9975]"
                : "bg-[#d5a23d]"
            )}
          />

          <div>
            <p className="text-[11px] font-semibold text-[#425a62]">
              Screening engine: {modelStatus}
            </p>

            <p className="text-[10px] text-[#95a1a5]">
              AI-assisted screening · Human clinical review remains authoritative
            </p>
          </div>

        </div>

        {!modelReady && (
          <span className="text-[10px] font-medium text-[#997027]">
            Trained weights not available on this device
          </span>
        )}

      </section>

    </div>
  )
}

function EyeStatusIcon() {
  return (
    <div className="h-2 w-2 rounded-full bg-[#7eb9b6] shadow-[0_0_0_4px_rgba(126,185,182,0.12)]" />
  )
}

function AssuranceStep({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="relative rounded-2xl border border-[#e2ebeb] bg-[#fbfdfc] p-4">

      <span className="text-[9px] font-bold tracking-[0.15em] text-[#9cafb1]">
        {number}
      </span>

      <div className="mt-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf4f3]">
        <Icon className="h-4 w-4 text-[#387a7d]" />
      </div>

      <p className="mt-4 text-[11px] font-semibold text-[#294853]">
        {title}
      </p>

      <p className="mt-1 text-[10px] leading-4 text-[#859398]">
        {description}
      </p>

    </div>
  )
}