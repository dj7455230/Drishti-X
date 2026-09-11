"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { api, screeningsApi } from "@/lib/api"
import { useAuthStore } from "@/lib/store"

import {
  Activity,
  AlertTriangle,
  Brain,
  Camera,
  CheckCircle2,
  CircleAlert,
  Eye,
  ImageIcon,
  Loader2,
  Microscope,
  RefreshCcw,
  ShieldCheck,
  Stethoscope,
  FileText,
  Download,
} from "lucide-react"

import type { LucideIcon } from "lucide-react"

import {
  cn,
  DR_GRADE_BG,
  DR_GRADE_COLORS,
  DR_GRADE_LABELS,
  formatConfidence,
} from "@/lib/utils"

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"

async function loadClinicalReport(id: string) {
  try {
    const response = await api.get(
      `/api/screenings/${id}/report`
    )

    return response.data
  } catch (error: any) {
    // Report does not exist yet -> generate it once
    if (error?.response?.status === 404) {
      const response = await api.post(
        `/api/screenings/${id}/report`
      )

      return response.data
    }

    throw error
  }
}

async function regenerateReport(id: string) {
  const response = await api.post(
    `/api/screenings/${id}/report`
  )

  return response.data
}

function getAssuranceConfig(decision?: string | null) {
  switch (decision) {
    case "VALIDATED":
      return {
        title: "Validated Prediction",
        description:
          "Prediction and supporting retinal evidence are sufficiently aligned for screening support.",
        badge:
          "border-[#b9ddce] bg-[#edf8f2] text-[#39745d]",
        panel: "bg-[#edf8f2]",
        icon: "text-[#3d7a61]",
      }

    case "HUMAN_REVIEW_REQUIRED":
      return {
        title: "Human Review Required",
        description:
          "The available evidence requires qualified clinical review before further action.",
        badge:
          "border-[#ead7ad] bg-[#fff8e8] text-[#91661f]",
        panel: "bg-[#fff8e8]",
        icon: "text-[#a47525]",
      }

    case "RECAPTURE_REQUIRED":
      return {
        title: "Recapture Required",
        description:
          "Image quality is insufficient for reliable retinal screening assessment.",
        badge:
          "border-[#edc5c2] bg-[#fff3f2] text-[#a64f4a]",
        panel: "bg-[#fff3f2]",
        icon: "text-[#ab514c]",
      }

    default:
      return {
        title: "Screening Assessment",
        description:
          "Clinical assurance information is not yet available.",
        badge:
          "border-[#dbe5e5] bg-[#f5f8f8] text-[#62747a]",
        panel: "bg-[#f5f8f8]",
        icon: "text-[#647d82]",
      }
  }
}

function mediaUrl(path?: string | null) {
  if (!path) return ""

  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path
  }

  return `${API_BASE}/${path.replace(/^\/+/, "")}`
}

export default function ScreeningDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [doctorGrade, setDoctorGrade] =
    useState<number | null>(null)

  const [doctorNotes, setDoctorNotes] =
    useState("")

  const [aiAccepted, setAiAccepted] =
    useState(true)

  const {
    data: report,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["screening-report", id],

    queryFn: () =>
      loadClinicalReport(id),

    retry: false,
  })

  const analyzeMutation = useMutation({
    mutationFn: () =>
      screeningsApi.analyze(id),

    onSuccess: async () => {
      await regenerateReport(id)

      await queryClient.invalidateQueries({
        queryKey: ["screening-report", id],
      })
    },
  })

  const reviewMutation = useMutation({
    mutationFn: () =>
      screeningsApi.doctorReview(id, {
        doctor_grade: doctorGrade,
        doctor_notes: doctorNotes,
        ai_grade_accepted: aiAccepted,
      }),

    onSuccess: async () => {
      await regenerateReport(id)

      await queryClient.invalidateQueries({
        queryKey: ["screening-report", id],
      })
    },
  })

  const recaptureMutation = useMutation({
    mutationFn: () =>
      screeningsApi.recapture(
        id,
        "Recapture requested by operator"
      ),

    onSuccess: async () => {
      await regenerateReport(id)

      await queryClient.invalidateQueries({
        queryKey: ["screening-report", id],
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">

        <div className="flex items-center gap-3 text-sm text-[#71848b]">

          <Activity className="h-5 w-5 animate-pulse text-[#3b7f83]" />

          Preparing clinical evidence report...

        </div>

      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="rounded-2xl border border-[#eccaca] bg-[#fff6f5] p-6">

        <p className="font-semibold text-[#a64f4f]">
          Unable to load screening report
        </p>

        <p className="mt-2 text-sm text-[#a96d68]">
          Confirm that the backend service is running and try again.
        </p>

      </div>
    )
  }

  const screening = report.screening || {}
  const patient = report.patient || {}

  const quality =
    report.image_quality || null

  const pred =
    report.ai_prediction || null

  const assurance =
    report.assurance || {}

  const recommendation =
    report.recommendation || {}
    const displayRecommendation =
  pred?.is_demo || !hasPrediction
    ? {
        clinical_pathway: "HUMAN_REVIEW_REQUIRED",
        action:
          "Ophthalmologist review is required before assigning a referral timeline or treatment pathway.",
      }
    : recommendation

  const doctorReview =
    report.doctor_review || null

  const lesionSummary =
    pred?.lesion_summary || null

  const predictedGrade =
    pred?.predicted_grade

  const hasPrediction =
    predictedGrade !== null &&
    predictedGrade !== undefined

  const assuranceStyle =
    getAssuranceConfig(
      assurance?.decision
    )

  const isDoctor =
    user?.role === "OPHTHALMOLOGIST" ||
    user?.role === "ADMIN"

  return (
    <div className="mx-auto max-w-[1320px] space-y-6 pb-12">

      {/* HEADER */}
      <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

        <div>

          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3c7c7e]">

            <Eye className="h-3.5 w-3.5" />

            Clinical Evidence Report

          </div>

          <h1 className="text-[30px] font-semibold tracking-[-0.035em] text-[#173746]">
            Retinal screening report
          </h1>

          <p className="mt-2 max-w-[680px] text-[12px] leading-5 text-[#718188]">
            Image quality, retinal evidence, screening classification
            and clinical assurance brought together in one review.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">

            <span className="font-mono text-[9px] text-[#9aa6aa]">
              Case {screening.id || id}
            </span>

            {patient.patient_code && (
              <span className="text-[9px] text-[#8b999e]">
                Patient {patient.patient_code}
              </span>
            )}

            {patient.age && (
              <span className="text-[9px] text-[#8b999e]">
                Age {patient.age}
              </span>
            )}

          </div>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          <a
            href={`${API_BASE}/api/screenings/${id}/report/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-[#173f56] bg-[#173f56] px-4 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#102f42]"
          >
            <FileText className="h-3.5 w-3.5" />
            Publish / Download PDF Report
          </a>

          <span
            className={cn(
              "rounded-full border px-4 py-2 text-[10px] font-bold",
              assuranceStyle.badge
            )}
          >
            {assuranceStyle.title}
          </span>

          {screening.status && (
            <span className="rounded-full border border-[#dde6e6] bg-white px-4 py-2 text-[10px] font-semibold text-[#63767c]">

              {String(
                screening.status
              ).replaceAll("_", " ")}

            </span>
          )}

        </div>

      </section>

      {/* ASSURANCE HERO */}
      <section
        className={cn(
          "relative overflow-hidden rounded-[26px] border border-[#dce7e7] p-6 lg:p-7",
          assuranceStyle.panel
        )}
      >

        <div className="absolute -right-20 -top-24 h-60 w-60 rounded-full border border-white/60" />

        <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-white/70" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">

              <ShieldCheck
                className={cn(
                  "h-5 w-5",
                  assuranceStyle.icon
                )}
              />

            </div>

            <div>

              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#809297]">
                Clinical Assurance Decision
              </p>

              <h2 className="mt-2 text-[23px] font-semibold tracking-[-0.025em] text-[#23434c]">
                {assuranceStyle.title}
              </h2>

              <p className="mt-2 max-w-[670px] text-[11px] leading-5 text-[#667e84]">
                {assuranceStyle.description}
              </p>

            </div>

          </div>

          {assurance.referral_priority && (
            <div className="min-w-[185px] rounded-2xl border border-white/80 bg-white/70 p-4">

              <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#8d9a9e]">
                Referral Priority
              </p>

              <div className="mt-2 flex items-end justify-between">

                <p
                  className={cn(
                    "text-[17px] font-bold",
                    assurance.referral_priority === "CRITICAL"
                      ? "text-[#b44d4d]"
                      : assurance.referral_priority === "HIGH"
                      ? "text-[#ae682b]"
                      : assurance.referral_priority === "MEDIUM"
                      ? "text-[#987125]"
                      : "text-[#46755f]"
                  )}
                >
                  {assurance.referral_priority}
                </p>

                <div className="text-right">

                  <p className="text-[8px] text-[#9aa6a9]">
                    score
                  </p>

                  <p className="text-lg font-semibold text-[#294750]">
                    {assurance.referral_score != null
                      ? Number(
                          assurance.referral_score
                        ).toFixed(0)
                      : "—"}
                  </p>

                </div>

              </div>

            </div>
          )}

        </div>

      </section>

      {/* DEMO MODE */}
      {pred?.is_demo && (
        <section className="flex items-start gap-3 rounded-2xl border border-[#ead8b3] bg-[#fffaf0] px-5 py-4">

          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#a67a2f]" />

          <div>

            <p className="text-[10px] font-semibold text-[#806329]">
              Demo environment
            </p>

            <p className="mt-1 text-[10px] leading-5 text-[#907847]">
              Trained retinal classifier weights are not loaded on
              this device. Classification is therefore withheld and
              the case remains routed for human review.
            </p>

          </div>

        </section>
      )}

      {/* PIPELINE */}
      <section className="rounded-[24px] border border-[#dce7e7] bg-white p-5 shadow-[0_10px_30px_rgba(38,69,80,0.035)]">

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

          <EvidenceStage
            number="01"
            icon={ImageIcon}
            title="Image Quality"
            status={
              quality
                ? quality.is_gradable
                  ? "Gradable"
                  : "Needs recapture"
                : "Unavailable"
            }
            complete={Boolean(quality)}
          />

          <EvidenceStage
            number="02"
            icon={Brain}
            title="DR Prediction"
            status={
              hasPrediction
                ? `Grade ${predictedGrade}`
                : pred
                ? "Unavailable"
                : "Pending"
            }
            complete={Boolean(pred)}
          />

          <EvidenceStage
            number="03"
            icon={Microscope}
            title="Evidence Check"
            status={
              pred?.concordance_level ||
              (lesionSummary
                ? "Evidence available"
                : "Unavailable")
            }
            complete={Boolean(
              lesionSummary
            )}
          />

          <EvidenceStage
            number="04"
            icon={ShieldCheck}
            title="Clinical Assurance"
            status={
              assurance.decision
                ? String(
                    assurance.decision
                  ).replaceAll("_", " ")
                : "Pending"
            }
            complete={Boolean(
              assurance.decision
            )}
          />

        </div>

      </section>

      {/* MAIN GRID */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">

        {/* LEFT */}
        <div className="space-y-5">

          {/* CLASSIFICATION */}
          <section className="rounded-[24px] border border-[#dce7e7] bg-white p-6 shadow-[0_10px_30px_rgba(38,69,80,0.04)]">

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf4f3]">

                  <Brain className="h-4 w-4 text-[#397b7c]" />

                </div>

                <div>

                  <h2 className="text-[14px] font-semibold text-[#254650]">
                    DR screening result
                  </h2>

                  <p className="mt-0.5 text-[9px] text-[#929fa3]">
                    Retinal severity assessment
                  </p>

                </div>

              </div>

              {pred?.model_status && (
                <span className="rounded-full bg-[#f3f6f6] px-3 py-1.5 text-[9px] font-semibold text-[#718287]">
                  {pred.model_status}
                </span>
              )}

            </div>

            {pred ? (
              <div className="mt-6">

                <div
                  className={cn(
                    "rounded-2xl border p-5",
                    hasPrediction
                      ? DR_GRADE_BG[
                          Number(
                            predictedGrade
                          )
                        ]
                      : "border-[#e3eaea] bg-[#fafcfc]"
                  )}
                >

                  <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#8c9a9e]">
                    Screening Classification
                  </p>

                  <p
                    className={cn(
                      "mt-2 text-[25px] font-semibold tracking-[-0.025em]",
                      hasPrediction
                        ? DR_GRADE_COLORS[
                            Number(
                              predictedGrade
                            )
                          ]
                        : "text-[#60757b]"
                    )}
                  >
                    {hasPrediction
                      ? `Grade ${predictedGrade} · ${
                          DR_GRADE_LABELS[
                            Number(
                              predictedGrade
                            )
                          ]
                        }`
                      : "Classification unavailable"}
                  </p>

                  {pred.confidence !== null &&
                    pred.confidence !== undefined && (
                      <p className="mt-2 text-[10px] text-[#657b81]">

                        Confidence{" "}

                        <span className="font-semibold text-[#376f72]">
                          {formatConfidence(
                            pred.confidence
                          )}
                        </span>

                      </p>
                    )}

                </div>

                {pred.probabilities && (
                  <div className="mt-6">

                    <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#909ea2]">
                      Grade Probability Distribution
                    </p>

                    <div className="space-y-3">

                      {Object.entries(
                        pred.probabilities
                      ).map(
                        ([grade, probability]: any) => (
                          <div
                            key={grade}
                            className="grid grid-cols-[105px_1fr_45px] items-center gap-3"
                          >

                            <span className="text-[9px] text-[#70858b]">
                              Grade {grade}
                            </span>

                            <div className="h-2 overflow-hidden rounded-full bg-[#edf2f2]">

                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  Number(
                                    grade
                                  ) ===
                                    Number(
                                      predictedGrade
                                    )
                                    ? "bg-[#4c8b8a]"
                                    : "bg-[#c9d8d7]"
                                )}
                                style={{
                                  width: `${
                                    Number(
                                      probability
                                    ) * 100
                                  }%`,
                                }}
                              />

                            </div>

                            <span className="text-right font-mono text-[9px] text-[#708086]">
                              {(
                                Number(
                                  probability
                                ) * 100
                              ).toFixed(1)}
                              %
                            </span>

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

                {pred.is_referable !== null &&
                  pred.is_referable !== undefined && (
                    <div
                      className={cn(
                        "mt-6 flex items-center gap-3 rounded-xl border px-4 py-3",
                        pred.is_referable
                          ? "border-[#efcfcc] bg-[#fff5f4]"
                          : "border-[#cce1d6] bg-[#f1f8f4]"
                      )}
                    >

                      {pred.is_referable ? (
                        <AlertTriangle className="h-4 w-4 text-[#ae514d]" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-[#487b63]" />
                      )}

                      <div>

                        <p
                          className={cn(
                            "text-[10px] font-bold",
                            pred.is_referable
                              ? "text-[#9e4d49]"
                              : "text-[#47735e]"
                          )}
                        >
                          {pred.is_referable
                            ? "REFERABLE DR"
                            : "NON-REFERABLE DR"}
                        </p>

                        <p className="mt-0.5 text-[9px] text-[#849297]">
                          {pred.is_referable
                            ? "Specialist review recommended"
                            : "No referable DR indicated by screening"}
                        </p>

                      </div>

                    </div>
                  )}

              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-[#e2eaea] bg-[#fafcfc] py-8 text-center">

                <p className="text-[11px] text-[#72868b]">
                  No screening prediction available.
                </p>

                {screening.status ===
                  "IMAGE_UPLOADED" && (
                  <button
                    onClick={() =>
                      analyzeMutation.mutate()
                    }
                    disabled={
                      analyzeMutation.isPending
                    }
                    className="mx-auto mt-4 flex h-10 items-center gap-2 rounded-xl bg-[#173f56] px-5 text-[11px] font-semibold text-white disabled:opacity-50"
                  >

                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        Run screening analysis
                      </>
                    )}

                  </button>
                )}

              </div>
            )}

          </section>

          {/* IMAGE QUALITY */}
          {quality && (
            <section className="rounded-[24px] border border-[#dce7e7] bg-white p-6 shadow-[0_10px_30px_rgba(38,69,80,0.04)]">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-[14px] font-semibold text-[#254650]">
                    Image quality evidence
                  </h2>

                  <p className="mt-1 text-[9px] text-[#929fa3]">
                    Capture quality assessed before classification
                  </p>

                </div>

                <span
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[9px] font-bold",
                    quality.is_gradable
                      ? "bg-[#edf8f2] text-[#42745e]"
                      : "bg-[#fff2f1] text-[#a7504c]"
                  )}
                >
                  {quality.is_gradable
                    ? "GRADABLE"
                    : "UNGRADABLE"}
                </span>

              </div>

              <div className="mt-6 space-y-4">

                {[
                  [
                    "Overall Quality",
                    quality.quality_score,
                  ],
                  [
                    "Focus",
                    quality.focus_score,
                  ],
                  [
                    "Illumination",
                    quality.illumination_score,
                  ],
                  [
                    "Field of View",
                    quality.fov_score,
                  ],
                ].map(([label, value]) => {

                  const numeric =
                    Number(value)

                  return (
                    <div
                      key={String(label)}
                      className="grid grid-cols-[105px_1fr_38px] items-center gap-3"
                    >

                      <span className="text-[9px] text-[#71848a]">
                        {String(label)}
                      </span>

                      <div className="h-2 overflow-hidden rounded-full bg-[#edf2f2]">

                        <div
                          className={cn(
                            "h-full rounded-full",
                            numeric >= 70
                              ? "bg-[#5b987c]"
                              : numeric >= 50
                              ? "bg-[#c69b4a]"
                              : "bg-[#c86b66]"
                          )}
                          style={{
                            width: `${Math.min(
                              100,
                              numeric || 0
                            )}%`,
                          }}
                        />

                      </div>

                      <span className="text-right font-mono text-[9px] text-[#677a80]">
                        {Number.isFinite(
                          numeric
                        )
                          ? numeric.toFixed(0)
                          : "—"}
                      </span>

                    </div>
                  )
                })}

              </div>

              {quality.feedback && (
                <div className="mt-5 rounded-xl bg-[#f5f9f8] px-4 py-3">

                  <p className="text-[10px] leading-5 text-[#6c8187]">
                    {quality.feedback}
                  </p>

                </div>
              )}

            </section>
          )}

        </div>

        {/* RIGHT */}
        <div className="space-y-5">

          {/* EXPLAINABILITY */}
          <section className="overflow-hidden rounded-[24px] border border-[#dce7e7] bg-white shadow-[0_10px_30px_rgba(38,69,80,0.04)]">

            <div className="border-b border-[#e8eeee] px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf4f3]">

                  <Eye className="h-4 w-4 text-[#397b7c]" />

                </div>

                <div>

                  <h2 className="text-[14px] font-semibold text-[#254650]">
                    Explainability & retinal evidence
                  </h2>

                  <p className="mt-0.5 text-[9px] text-[#929fa3]">
                    Independent evidence supporting the screening output
                  </p>

                </div>

              </div>

            </div>

            {pred?.gradcam_path ? (
              <div className="bg-[#102f3b] p-5">

                <img
                  src={mediaUrl(
                    pred.gradcam_path
                  )}
                  alt="Grad-CAM explanation"
                  className="mx-auto max-h-[360px] w-full rounded-2xl object-contain"
                />

                <p className="mt-4 text-[9px] text-white/45">
                  Grad-CAM retinal explanation map
                </p>

              </div>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center bg-[#f8fbfa] px-6 text-center">

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf4f3]">

                  <Eye className="h-5 w-5 text-[#4b8784]" />

                </div>

                <p className="mt-4 text-[11px] font-semibold text-[#526a71]">
                  Explainability map unavailable
                </p>

                <p className="mt-1 max-w-[300px] text-[9px] leading-4 text-[#96a2a6]">
                  A Grad-CAM evidence map will appear when a
                  trained classifier prediction is available.
                </p>

              </div>
            )}

            {lesionSummary && (
              <div className="border-t border-[#e8eeee] p-6">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <p className="text-[10px] font-semibold text-[#38565e]">
                      Retinal lesion evidence
                    </p>

                    <p className="mt-1 text-[9px] text-[#929fa3]">
                      Candidate findings detected independently
                    </p>

                  </div>

                  {pred?.concordance_level && (
                    <span
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[9px] font-bold",
                        pred.concordance_level === "HIGH"
                          ? "bg-[#edf8f2] text-[#42745e]"
                          : pred.concordance_level === "MODERATE"
                          ? "bg-[#fff8e8] text-[#95691e]"
                          : "bg-[#fff1ef] text-[#a64f4a]"
                      )}
                    >
                      {pred.concordance_level} CONCORDANCE
                    </span>
                  )}

                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">

                  <LesionMetric
                    label="Microaneurysms"
                    value={
                      lesionSummary
                        ?.microaneurysms
                        ?.count ?? 0
                    }
                  />

                  <LesionMetric
                    label="Hemorrhages"
                    value={
                      lesionSummary
                        ?.hemorrhages
                        ?.count ?? 0
                    }
                  />

                  <LesionMetric
                    label="Exudates"
                    value={
                      lesionSummary
                        ?.hard_exudates
                        ?.count ?? 0
                    }
                  />

                </div>

                <div className="mt-5 rounded-xl bg-[#f5f9f8] p-4">

                  <div className="flex items-center justify-between">

                    <span className="text-[9px] text-[#72858a]">
                      Evidence score
                    </span>

                    <span className="text-[12px] font-semibold text-[#3d7778]">
                      {(
                        (lesionSummary
                          ?.lesion_evidence_score ??
                          0) * 100
                      ).toFixed(0)}
                      %
                    </span>

                  </div>

                </div>

                {pred?.mismatch_detected && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#ead7ad] bg-[#fff8e8] px-4 py-3">

                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9e7024]" />

                    <p className="text-[9px] leading-5 text-[#826528]">
                      Prediction and retinal evidence are not
                      sufficiently aligned. Human review is required.
                    </p>

                  </div>
                )}

              </div>
            )}

          </section>

          {/* WHY THIS DECISION */}
          {assurance.reasons?.length > 0 && (
            <section className="rounded-[24px] border border-[#dce7e7] bg-white p-6 shadow-[0_10px_30px_rgba(38,69,80,0.04)]">

              <div className="flex items-center gap-2">

                <ShieldCheck className="h-4 w-4 text-[#3f7f7d]" />

                <h2 className="text-[13px] font-semibold text-[#294c55]">
                  Why this assurance decision
                </h2>

              </div>

              <div className="mt-5 space-y-2.5">

                {assurance.reasons.map(
                  (
                    reason: string,
                    index: number
                  ) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-xl bg-[#f5f9f8] px-4 py-3"
                    >

                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4b8882]" />

                      <p className="text-[10px] leading-5 text-[#60767c]">
                        {reason}
                      </p>

                    </div>
                  )
                )}

              </div>

            </section>
          )}

          {/* RECOMMENDATION */}
          {displayRecommendation?.action && (
            <section className="rounded-[24px] border border-[#d8e6e5] bg-[#f3f8f7] p-6">

              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#658489]">
                Recommended Clinical Pathway
              </p>

              <p className="mt-3 text-[14px] font-semibold text-[#31525a]">
                {String(
                  displayRecommendation.clinical_pathway||
                    "Clinical Review"
                ).replaceAll("_", " ")}
              </p>

              <p className="mt-2 text-[10px] leading-5 text-[#6d8187]">
                {displayRecommendation.action}
              </p>

            </section>
          )}

        </div>

      </section>

      {/* EXISTING DOCTOR REVIEW */}
      {doctorReview && (
        <section className="rounded-[24px] border border-[#dce7e7] bg-white p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf4f3]">

              <Stethoscope className="h-4 w-4 text-[#3e7d7d]" />

            </div>

            <div>

              <p className="text-[13px] font-semibold text-[#31515a]">
                Ophthalmologist review completed
              </p>

              <p className="mt-1 text-[9px] text-[#89979c]">
                Clinical assessment stored separately from the screening model.
              </p>

            </div>

          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">

            <InfoBox
              label="Doctor Grade"
              value={
                doctorReview.doctor_grade != null
                  ? `Grade ${doctorReview.doctor_grade}`
                  : "—"
              }
            />

            <InfoBox
              label="AI Grade Accepted"
              value={
                doctorReview.ai_grade_accepted === true
                  ? "Yes"
                  : doctorReview.ai_grade_accepted === false
                  ? "No"
                  : "—"
              }
            />

            <InfoBox
              label="Grade Modified"
              value={
                doctorReview.ai_grade_modified
                  ? "Yes"
                  : "No"
              }
            />

          </div>

          {doctorReview.doctor_notes && (
            <div className="mt-4 rounded-xl bg-[#f6f9f8] p-4">

              <p className="text-[9px] font-semibold text-[#75868b]">
                Clinical notes
              </p>

              <p className="mt-2 text-[10px] leading-5 text-[#566e75]">
                {doctorReview.doctor_notes}
              </p>

            </div>
          )}

        </section>
      )}

      {/* DOCTOR REVIEW FORM */}
      {!doctorReview &&
        pred && (
          <section className="rounded-[26px] border border-[#d8e5e4] bg-white p-6 shadow-[0_12px_34px_rgba(38,69,80,0.045)] lg:p-7">

            <div className="flex items-start gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf4f3]">

                <Stethoscope className="h-5 w-5 text-[#397b7c]" />

              </div>

              <div>

                <h2 className="text-[15px] font-semibold text-[#254650]">
                  Ophthalmologist review
                </h2>

                <p className="mt-1 text-[10px] leading-5 text-[#849297]">
                  The clinician's assessment remains the authoritative record.
                </p>

              </div>

            </div>

            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">

              <div>

                <label className="mb-3 block text-[10px] font-semibold text-[#536970]">
                  Clinical DR grade
                </label>

                <div className="grid grid-cols-5 gap-2">

                  {[0, 1, 2, 3, 4].map(
                    (grade) => (
                      <button
                        key={grade}
                        onClick={() =>
                          setDoctorGrade(
                            grade
                          )
                        }
                        className={cn(
                          "h-11 rounded-xl border text-[12px] font-bold transition",
                          doctorGrade ===
                            grade
                            ? cn(
                                DR_GRADE_BG[
                                  grade
                                ],
                                DR_GRADE_COLORS[
                                  grade
                                ]
                              )
                            : "border-[#dde6e6] bg-[#fafcfc] text-[#718287] hover:border-[#a9c8c6]"
                        )}
                      >
                        {grade}
                      </button>
                    )
                  )}

                </div>

                {doctorGrade !== null && (
                  <p className="mt-2 text-[10px] font-medium text-[#687d82]">
                    {
                      DR_GRADE_LABELS[
                        doctorGrade
                      ]
                    }
                  </p>
                )}

              </div>

              <div>

                <label className="mb-3 block text-[10px] font-semibold text-[#536970]">
                  Does clinical assessment agree with AI grade?
                </label>

                <div className="grid grid-cols-2 gap-2">

                  <button
                    onClick={() =>
                      setAiAccepted(true)
                    }
                    className={cn(
                      "h-11 rounded-xl border text-[11px] font-semibold transition",
                      aiAccepted
                        ? "border-[#b9d9ca] bg-[#edf8f2] text-[#42745e]"
                        : "border-[#dde6e6] bg-white text-[#718287]"
                    )}
                  >
                    Agree
                  </button>

                  <button
                    onClick={() =>
                      setAiAccepted(false)
                    }
                    className={cn(
                      "h-11 rounded-xl border text-[11px] font-semibold transition",
                      !aiAccepted
                        ? "border-[#edc8c5] bg-[#fff3f2] text-[#a64f4a]"
                        : "border-[#dde6e6] bg-white text-[#718287]"
                    )}
                  >
                    Disagree
                  </button>

                </div>

              </div>

            </div>

            <div className="mt-6">

              <label className="mb-2 block text-[10px] font-semibold text-[#536970]">
                Clinical notes
              </label>

              <textarea
                value={doctorNotes}
                onChange={(e) =>
                  setDoctorNotes(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Document clinical observations or referral recommendations..."
                className="w-full resize-none rounded-xl border border-[#d7e2e2] bg-[#fbfdfc] px-4 py-3 text-[11px] text-[#294852] outline-none transition placeholder:text-[#9da8ac] focus:border-[#548c89] focus:bg-white focus:ring-4 focus:ring-[#548c89]/10"
              />

            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">

              <button
                onClick={() =>
                  reviewMutation.mutate()
                }
                disabled={
                  doctorGrade === null ||
                  reviewMutation.isPending
                }
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173f56] px-6 text-[11px] font-semibold text-white transition hover:bg-[#102f42] disabled:opacity-45"
              >

                {reviewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}

                Submit clinical review

              </button>

              <button
                onClick={() =>
                  recaptureMutation.mutate()
                }
                disabled={
                  recaptureMutation.isPending
                }
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e2c8a6] bg-[#fff9ef] px-6 text-[11px] font-semibold text-[#936928] transition hover:bg-[#fff4e1]"
              >

                {recaptureMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}

                Request recapture

              </button>

            </div>

          </section>
        )}

      {/* FOOTER */}
      <section className="flex items-center justify-center gap-2 border-t border-[#e2eaea] pt-5 text-center">

        <Stethoscope className="h-3.5 w-3.5 text-[#84989d]" />

        <p className="text-[9px] text-[#98a5a9]">
          AI-assisted retinal screening and clinical decision support ·
          Final diagnosis remains with a qualified ophthalmologist
        </p>

      </section>

    </div>
  )
}

function EvidenceStage({
  number,
  icon: Icon,
  title,
  status,
  complete,
}: {
  number: string
  icon: LucideIcon
  title: string
  status: string
  complete: boolean
}) {
  return (
    <div className="rounded-2xl border border-[#e2ebeb] bg-[#fbfdfc] p-4">

      <div className="flex items-center justify-between">

        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            complete
              ? "bg-[#eaf4f3]"
              : "bg-[#f1f4f4]"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              complete
                ? "text-[#3e7f7e]"
                : "text-[#9da9ac]"
            )}
          />
        </div>

        <span className="text-[8px] font-bold tracking-[0.15em] text-[#acb7ba]">
          {number}
        </span>

      </div>

      <p className="mt-4 text-[10px] font-semibold text-[#34535b]">
        {title}
      </p>

      <p
        className={cn(
          "mt-1 truncate text-[8px] font-medium",
          complete
            ? "text-[#5e8383]"
            : "text-[#9ba6aa]"
        )}
      >
        {status}
      </p>

    </div>
  )
}

function LesionMetric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-[#e3ebeb] bg-[#fbfdfc] p-3 text-center">

      <p className="text-[18px] font-semibold text-[#294b53]">
        {value}
      </p>

      <p className="mt-1 text-[8px] leading-3 text-[#89979c]">
        {label}
      </p>

    </div>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-[#e2eaea] bg-[#fafcfc] p-4">

      <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#96a2a6]">
        {label}
      </p>

      <p className="mt-2 text-[11px] font-semibold text-[#3d5961]">
        {value}
      </p>

    </div>
  )
}