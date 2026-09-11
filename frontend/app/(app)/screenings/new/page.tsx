"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { screeningsApi, patientsApi, api } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Brain,
  FileImage,
  UserRound,
  ShieldCheck,
  Camera,
  Activity,
  Stethoscope,
  ChevronRight,
  ArrowRight,
  RefreshCcw,
  ImageIcon,
  LockKeyhole,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Step = "patient" | "upload" | "analyze" | "result"

const steps: {
  key: Step
  label: string
  description: string
}[] = [
  {
    key: "patient",
    label: "Patient",
    description: "Create case",
  },
  {
    key: "upload",
    label: "Fundus Image",
    description: "Capture evidence",
  },
  {
    key: "analyze",
    label: "Screening",
    description: "Clinical analysis",
  },
  {
    key: "result",
    label: "Assurance",
    description: "Clinical decision",
  },
]

function formatApiError(error: any, fallback: string) {
  const detail = error?.response?.data?.detail

  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => item?.msg || "Validation error")
      .join(", ")
  }

  if (typeof detail === "string") return detail

  return fallback
}

export default function NewScreeningPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>("patient")
  const [age, setAge] = useState("")
  const [patientId, setPatientId] = useState("")
  const [screeningId, setScreeningId] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  // Create patient + screening
  const createMutation = useMutation({
    mutationFn: async (patientAge: number) => {
      const patientRes = await patientsApi.create({
        age: patientAge,
      })

      const patient = patientRes.data

      const screenRes = await screeningsApi.create({
        patient_id: patient.id,
      })

      return {
        patient,
        screening: screenRes.data,
      }
    },

    onSuccess: ({ patient, screening }) => {
      setPatientId(patient.id)
      setScreeningId(screening.id)
      setStep("upload")
      setError("")
    },

    onError: (e: any) =>
      setError(
        formatApiError(
          e,
          "Unable to create the screening case."
        )
      ),
  })

  // Upload fundus image
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return screeningsApi.uploadImage(screeningId, file)
    },

    onSuccess: () => {
      setStep("analyze")
      setError("")
    },

    onError: (e: any) =>
      setError(
        formatApiError(
          e,
          "Unable to upload the retinal image."
        )
      ),
  })

  // Run analysis
  const analyzeMutation = useMutation({
    mutationFn: () =>
      screeningsApi.analyze(screeningId),

    onSuccess: (res) => {
      setResult(res.data)
      setStep("result")
      setError("")
    },

    onError: (e: any) =>
      setError(
        formatApiError(
          e,
          "Screening analysis could not be completed."
        )
      ),
  })

  const handleFileSelect = useCallback((file: File) => {
    setImageFile(file)

    const reader = new FileReader()

    reader.onload = (event) => {
      setImagePreview(
        event.target?.result as string
      )
    }

    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()

      const file = e.dataTransfer.files[0]

      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleCreatePatient = () => {
    const numericAge = Number(age)

    if (
      !age ||
      Number.isNaN(numericAge) ||
      numericAge < 1 ||
      numericAge > 120
    ) {
      setError(
        "Please enter a valid patient age between 1 and 120."
      )
      return
    }

    setError("")
    createMutation.mutate(numericAge)
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 pb-10">

      {/* PAGE HEADER */}
      <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3c7c7e]">
            <Eye className="h-3.5 w-3.5" />
            Retinal Screening
          </div>

          <h1 className="text-[30px] font-semibold tracking-[-0.035em] text-[#173746]">
            New patient screening
          </h1>

          <p className="mt-2 max-w-[620px] text-[13px] leading-6 text-[#718188]">
            Capture a fundus image, assess retinal quality and
            generate an evidence-supported screening result for
            clinical review.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#dae7e6] bg-[#f7fbfa] px-4 py-3">
          <LockKeyhole className="h-4 w-4 text-[#4d817c]" />

          <div>
            <p className="text-[10px] font-semibold text-[#486168]">
              De-identified workflow
            </p>

            <p className="text-[9px] text-[#91a0a5]">
              No personal identifier required
            </p>
          </div>
        </div>
      </section>

      {/* PROGRESS JOURNEY */}
      <section className="rounded-[22px] border border-[#dce7e7] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(38,69,80,0.035)]">

        <div className="grid grid-cols-4">

          {steps.map((item, index) => {
            const active = item.key === step
            const currentIndex = steps.findIndex(
              (entry) => entry.key === step
            )
            const complete = currentIndex > index

            return (
              <div
                key={item.key}
                className="relative"
              >
                {index < steps.length - 1 && (
                  <div className="absolute left-[50%] top-[18px] h-px w-full bg-[#e1eaea]" />
                )}

                {index < steps.length - 1 && complete && (
                  <div className="absolute left-[50%] top-[18px] z-[1] h-px w-full bg-[#69a3a0]" />
                )}

                <div className="relative z-10 flex flex-col items-center text-center">

                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold transition-all",
                      complete
                        ? "border-[#5f9994] bg-[#5f9994] text-white"
                        : active
                        ? "border-[#245f6a] bg-[#173f56] text-white shadow-[0_5px_14px_rgba(23,63,86,0.18)]"
                        : "border-[#dce5e5] bg-white text-[#9aa7ab]"
                    )}
                  >
                    {complete ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <p
                    className={cn(
                      "mt-2 text-[10px] font-semibold",
                      active
                        ? "text-[#294c55]"
                        : complete
                        ? "text-[#5d7c7d]"
                        : "text-[#9ba7ab]"
                    )}
                  >
                    {item.label}
                  </p>

                  <p className="mt-0.5 hidden text-[9px] text-[#a2adaf] sm:block">
                    {item.description}
                  </p>

                </div>
              </div>
            )
          })}

        </div>
      </section>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#eccaca] bg-[#fff6f5] px-4 py-3 text-sm text-[#a64f4f]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ───────────────── STEP 1 ───────────────── */}
        {step === "patient" && (
          <motion.div
            key="patient"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_0.65fr]">

              {/* FORM */}
              <section className="rounded-[24px] border border-[#dce7e7] bg-white p-6 shadow-[0_12px_34px_rgba(38,69,80,0.04)] lg:p-7">

                <div className="flex items-start gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf4f3]">
                    <UserRound className="h-5 w-5 text-[#387a7d]" />
                  </div>

                  <div>
                    <h2 className="text-[16px] font-semibold text-[#193946]">
                      Patient information
                    </h2>

                    <p className="mt-1 text-[11px] leading-5 text-[#839197]">
                      Begin with essential screening information.
                      The system generates a de-identified patient case.
                    </p>
                  </div>

                </div>

                <div className="mt-7 max-w-[470px]">

                  <label className="mb-2 block text-[11px] font-semibold text-[#415a62]">
                    Patient age
                  </label>

                  <div className="relative">

                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={age}
                      onChange={(e) => {
                        setAge(e.target.value)
                        if (error) setError("")
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !createMutation.isPending
                        ) {
                          handleCreatePatient()
                        }
                      }}
                      placeholder="e.g. 45"
                      className="h-[54px] w-full rounded-xl border border-[#d6e0e0] bg-[#fbfdfc] px-4 pr-16 text-[14px] font-medium text-[#193946] outline-none transition placeholder:text-[#aab3b6] focus:border-[#4c8988] focus:bg-white focus:ring-4 focus:ring-[#4c8988]/10"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-[#9ba6aa]">
                      years
                    </span>

                  </div>

                  <p className="mt-2 text-[10px] leading-4 text-[#99a5a9]">
                    Age supports clinical context and does not
                    identify the patient.
                  </p>

                </div>

                <button
                  onClick={handleCreatePatient}
                  disabled={createMutation.isPending}
                  className="group mt-7 inline-flex h-[48px] items-center justify-center gap-2 rounded-xl bg-[#173f56] px-6 text-[12px] font-semibold text-white shadow-[0_7px_20px_rgba(23,63,86,0.16)] transition hover:bg-[#102f42] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating case...
                    </>
                  ) : (
                    <>
                      Create screening case
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

              </section>

              {/* CONTEXT PANEL */}
              <aside className="relative overflow-hidden rounded-[24px] bg-[#173f56] p-6 text-white">

                <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full border border-white/10" />
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full border border-white/10" />

                <ShieldCheck className="relative h-5 w-5 text-[#9fcfcd]" />

                <h3 className="relative mt-5 text-[15px] font-semibold">
                  Privacy by design
                </h3>

                <p className="relative mt-2 text-[11px] leading-5 text-white/60">
                  Screening records are created using system-generated
                  case identifiers, supporting privacy-conscious rural
                  screening workflows.
                </p>

                <div className="relative mt-7 border-t border-white/10 pt-5">

                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9fcfcd]">
                    Next step
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <Camera className="h-4 w-4 text-white/65" />

                    <span className="text-[11px] text-white/70">
                      Upload retinal fundus image
                    </span>
                  </div>

                </div>

              </aside>
            </div>
          </motion.div>
        )}

        {/* ───────────────── STEP 2 ───────────────── */}
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_0.75fr]">

              <section className="rounded-[24px] border border-[#dce7e7] bg-white p-6 shadow-[0_12px_34px_rgba(38,69,80,0.04)]">

                <div className="flex items-start justify-between gap-4">

                  <div className="flex items-start gap-3">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf4f3]">
                      <FileImage className="h-5 w-5 text-[#387a7d]" />
                    </div>

                    <div>
                      <h2 className="text-[16px] font-semibold text-[#193946]">
                        Fundus image
                      </h2>

                      <p className="mt-1 text-[11px] text-[#839197]">
                        Upload the retinal image captured during screening.
                      </p>
                    </div>

                  </div>

                  {patientId && (
                    <div className="rounded-lg bg-[#f1f7f6] px-3 py-2 text-right">
                      <p className="text-[8px] font-semibold uppercase tracking-wider text-[#91a0a5]">
                        Case created
                      </p>

                      <p className="mt-0.5 max-w-[100px] truncate text-[9px] font-medium text-[#4a7374]">
                        {patientId}
                      </p>
                    </div>
                  )}

                </div>

                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() =>
                    document
                      .getElementById("file-input")
                      ?.click()
                  }
                  className={cn(
                    "group mt-6 cursor-pointer overflow-hidden rounded-[20px] border-2 border-dashed transition-all",
                    imagePreview
                      ? "border-[#a8cac7] bg-[#f5faf9]"
                      : "border-[#d5e2e1] bg-[#fafcfb] hover:border-[#75aaa7] hover:bg-[#f5faf9]"
                  )}
                >
                  <input
                    id="file-input"
                    type="file"
                    hidden
                    accept=".jpg,.jpeg,.png,.tiff,.bmp"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handleFileSelect(
                        e.target.files[0]
                      )
                    }
                  />

                  {imagePreview ? (
                    <div className="grid min-h-[320px] grid-cols-1 lg:grid-cols-[1fr_220px]">

                      <div className="flex items-center justify-center bg-[#102d38] p-5">

                        <img
                          src={imagePreview}
                          alt="Fundus preview"
                          className="max-h-[290px] max-w-full rounded-full object-contain shadow-[0_0_40px_rgba(0,0,0,0.18)]"
                        />

                      </div>

                      <div className="flex flex-col justify-center p-5">

                        <CheckCircle2 className="h-6 w-6 text-[#438579]" />

                        <p className="mt-4 text-[12px] font-semibold text-[#31525a]">
                          Image ready
                        </p>

                        <p className="mt-2 break-all text-[10px] leading-4 text-[#87959a]">
                          {imageFile?.name}
                        </p>

                        <button
                          type="button"
                          className="mt-5 flex items-center gap-2 text-[10px] font-semibold text-[#3c7779]"
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          Choose another image
                        </button>

                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">

                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf4f3]">
                        <Upload className="h-5 w-5 text-[#3f7f80]" />
                      </div>

                      <p className="mt-5 text-[13px] font-semibold text-[#35545c]">
                        Drop fundus image here
                      </p>

                      <p className="mt-1 text-[11px] text-[#8b999e]">
                        or click to browse your device
                      </p>

                      <div className="mt-5 rounded-full bg-white px-4 py-2 text-[9px] font-medium text-[#98a4a8] shadow-sm">
                        JPG · PNG · TIFF · BMP · max 20 MB
                      </div>

                    </div>
                  )}

                </div>

                <button
                  onClick={() =>
                    imageFile &&
                    uploadMutation.mutate(imageFile)
                  }
                  disabled={
                    !imageFile ||
                    uploadMutation.isPending
                  }
                  className="group mt-6 flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#173f56] px-6 text-[12px] font-semibold text-white transition hover:bg-[#102f42] disabled:cursor-not-allowed disabled:bg-[#9caeb5]"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading retinal image...
                    </>
                  ) : (
                    <>
                      Continue to clinical analysis
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

              </section>

              {/* Capture guidance */}
              <aside className="rounded-[24px] border border-[#dce7e7] bg-[#f9fcfb] p-6">

                <Camera className="h-5 w-5 text-[#467d7d]" />

                <h3 className="mt-4 text-[13px] font-semibold text-[#35525a]">
                  Capture guidance
                </h3>

                <p className="mt-2 text-[10px] leading-5 text-[#819095]">
                  A usable retinal image should provide sufficient
                  field visibility, focus and illumination for
                  screening analysis.
                </p>

                <div className="mt-6 space-y-4">

                  {[
                    "Retinal field clearly visible",
                    "Minimal blur or motion",
                    "Balanced illumination",
                    "Optic disc and vessels visible",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-[#5f9994]" />
                      <span className="text-[10px] text-[#677d83]">
                        {item}
                      </span>
                    </div>
                  ))}

                </div>

                <div className="mt-7 rounded-xl border border-[#dbe9e7] bg-white p-4">

                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#4e807e]">
                    Quality gate
                  </p>

                  <p className="mt-2 text-[10px] leading-5 text-[#7d8d92]">
                    Poor image quality can route the case to
                    recapture instead of producing an unsupported
                    screening result.
                  </p>

                </div>

              </aside>

            </div>
          </motion.div>
        )}

        {/* ───────────────── STEP 3 ───────────────── */}
        {step === "analyze" && (
          <motion.div
            key="analyze"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AnalyzeStep
              imagePreview={imagePreview}
              onAnalyze={() =>
                analyzeMutation.mutate()
              }
              isPending={
                analyzeMutation.isPending
              }
            />
          </motion.div>
        )}

        {/* ───────────────── STEP 4 ───────────────── */}
        {step === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ResultCard
              result={result}
              screeningId={screeningId}
              imagePreview={imagePreview}
              router={router}
            />
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  )
}

function AnalyzeStep({
  imagePreview,
  onAnalyze,
  isPending,
}: {
  imagePreview: string | null
  onAnalyze: () => void
  isPending: boolean
}) {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () =>
      api
        .get("/api/health")
        .then((r) => r.data),
    staleTime: 30_000,
  })

  const modelStatus: string =
    health?.model_status ?? "CHECKING..."

  const isReal =
    modelStatus === "TRAINED" ||
    modelStatus === "VALIDATED"

  const pipeline = [
    {
      icon: ImageIcon,
      title: "Image Quality",
      description:
        "Focus, illumination and field visibility",
    },
    {
      icon: Brain,
      title: "DR Prediction",
      description:
        "Severity grade and confidence",
    },
    {
      icon: Eye,
      title: "Evidence Review",
      description:
        "Lesions and explainability evidence",
    },
    {
      icon: ShieldCheck,
      title: "Clinical Assurance",
      description:
        "Validate, review or recapture",
    },
  ]

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#dce7e7] bg-white shadow-[0_12px_34px_rgba(38,69,80,0.04)]">

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">

        {/* IMAGE */}
        <div className="flex min-h-[430px] flex-col bg-[#112f3c] p-6">

          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Retinal image
          </p>

          <div className="flex flex-1 items-center justify-center py-6">

            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Uploaded retina"
                className="max-h-[285px] max-w-full rounded-full object-contain shadow-[0_0_50px_rgba(0,0,0,0.28)]"
              />
            ) : (
              <FileImage className="h-12 w-12 text-white/20" />
            )}

          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">

              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isReal
                    ? "bg-[#74b697]"
                    : "bg-[#d6a648]"
                )}
              />

              <span className="text-[10px] font-medium text-white/60">
                {isReal
                  ? "Screening engine ready"
                  : "Demo environment"}
              </span>

            </div>

            {!isReal && (
              <p className="mt-2 text-[9px] leading-4 text-white/35">
                Trained classifier weights are unavailable on
                this local device.
              </p>
            )}
          </div>

        </div>

        {/* ANALYSIS */}
        <div className="p-6 lg:p-8">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf4f3]">
              <Activity className="h-5 w-5 text-[#3a7d7d]" />
            </div>

            <div>
              <h2 className="text-[17px] font-semibold text-[#193946]">
                Ready for screening analysis
              </h2>

              <p className="mt-1 max-w-[560px] text-[11px] leading-5 text-[#839197]">
                The retinal image will pass through independent
                quality, prediction and evidence checks before
                the Clinical Assurance decision.
              </p>
            </div>

          </div>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">

            {pipeline.map(
              ({
                icon: Icon,
                title,
                description,
              }, index) => (
                <div
                  key={title}
                  className="rounded-2xl border border-[#e2ebeb] bg-[#fbfdfc] p-4"
                >
                  <div className="flex items-center justify-between">

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf6f5]">
                      <Icon className="h-4 w-4 text-[#3d7e7e]" />
                    </div>

                    <span className="text-[9px] font-bold tracking-[0.12em] text-[#afbbbd]">
                      0{index + 1}
                    </span>

                  </div>

                  <p className="mt-4 text-[11px] font-semibold text-[#33535b]">
                    {title}
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-[#8a989d]">
                    {description}
                  </p>

                </div>
              )
            )}

          </div>

          <button
            onClick={onAnalyze}
            disabled={isPending}
            className="group mt-7 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#173f56] text-[12px] font-semibold text-white shadow-[0_7px_20px_rgba(23,63,86,0.16)] transition hover:bg-[#102f42] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running clinical pipeline...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Run screening analysis
              </>
            )}
          </button>

          <p className="mt-3 text-center text-[9px] text-[#9aa5a9]">
            Screening support only · Clinical review remains authoritative
          </p>

        </div>
      </div>
    </section>
  )
}

function ResultCard({
  result,
  screeningId,
  imagePreview,
  router,
}: {
  result: any
  screeningId: string
  imagePreview: string | null
  router: ReturnType<typeof useRouter>
}) {
  const assuranceStyle = {
    VALIDATED: {
      label: "Validated Prediction",
      badge:
        "border-[#b8ddce] bg-[#edf8f2] text-[#3d765e]",
      iconBg: "bg-[#e6f5ed]",
      iconText: "text-[#3c7b61]",
    },

    HUMAN_REVIEW_REQUIRED: {
      label: "Human Review Required",
      badge:
        "border-[#ead7ad] bg-[#fff8e8] text-[#95691e]",
      iconBg: "bg-[#fff5dd]",
      iconText: "text-[#9a6d22]",
    },

    RECAPTURE_REQUIRED: {
      label: "Recapture Required",
      badge:
        "border-[#edc5c2] bg-[#fff3f2] text-[#a84f4a]",
      iconBg: "bg-[#fff0ef]",
      iconText: "text-[#ad504c]",
    },
  }[
    result.assurance_decision as
      | "VALIDATED"
      | "HUMAN_REVIEW_REQUIRED"
      | "RECAPTURE_REQUIRED"
  ] ?? {
    label:
      result.assurance_decision ||
      "Screening Result",
    badge:
      "border-[#dce5e5] bg-[#f6f9f8] text-[#607279]",
    iconBg: "bg-[#eef3f3]",
    iconText: "text-[#647b80]",
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#dce7e7] bg-white shadow-[0_12px_34px_rgba(38,69,80,0.04)]">

      {/* RESULT HEADER */}
      <div className="border-b border-[#e9efef] bg-[#fbfdfc] px-6 py-5 lg:px-7">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div className="flex items-center gap-3">

            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl",
                assuranceStyle.iconBg
              )}
            >
              <ShieldCheck
                className={cn(
                  "h-5 w-5",
                  assuranceStyle.iconText
                )}
              />
            </div>

            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#93a0a4]">
                Clinical Assurance
              </p>

              <h2 className="mt-1 text-[17px] font-semibold text-[#193946]">
                Screening analysis complete
              </h2>
            </div>

          </div>

          <span
            className={cn(
              "w-fit rounded-full border px-4 py-2 text-[10px] font-bold",
              assuranceStyle.badge
            )}
          >
            {assuranceStyle.label}
          </span>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">

        {/* RETINA */}
        <div className="bg-[#112f3c] p-6">

          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Screened fundus image
          </p>

          <div className="flex min-h-[260px] items-center justify-center py-5">

            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Screened retina"
                className="max-h-[245px] max-w-full rounded-full object-contain"
              />
            ) : (
              <Eye className="h-12 w-12 text-white/20" />
            )}

          </div>

          {result.is_demo && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[9px] font-semibold text-[#e3c17a]">
                Demo environment
              </p>

              <p className="mt-1 text-[8px] leading-4 text-white/40">
                Local trained model weights are unavailable.
                Do not interpret this output as a clinical prediction.
              </p>
            </div>
          )}

        </div>

        {/* RESULTS */}
        <div className="space-y-6 p-6 lg:p-7">

          {/* Warning */}
          {result.warnings?.length > 0 && (
            <div className="rounded-xl border border-[#ecd9ad] bg-[#fff9ea] px-4 py-3">

              {result.warnings.map(
                (warning: string, index: number) => (
                  <p
                    key={index}
                    className="flex gap-2 text-[10px] leading-5 text-[#896626]"
                  >
                    <AlertCircle className="mt-1 h-3 w-3 shrink-0" />
                    {warning}
                  </p>
                )
              )}

            </div>
          )}

          {/* DR Prediction */}
          <div>

            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#93a1a5]">
              DR Screening Result
            </p>

            <div className="mt-3 flex flex-col justify-between gap-4 rounded-2xl border border-[#e0eaea] bg-[#fafcfb] p-5 sm:flex-row sm:items-center">

              <div>
                <p className="text-[22px] font-semibold tracking-[-0.03em] text-[#193946]">
                  {result.grade_label ??
                    "Not available"}
                </p>

                {result.confidence && (
                  <p className="mt-1 text-[10px] text-[#657d83]">
                    Model confidence{" "}
                    <span className="font-semibold text-[#3b7778]">
                      {(
                        result.confidence * 100
                      ).toFixed(1)}
                      %
                    </span>
                  </p>
                )}
              </div>

              {result.is_referable !== null &&
                result.is_referable !==
                  undefined && (
                  <span
                    className={cn(
                      "w-fit rounded-full px-3 py-1.5 text-[9px] font-bold",
                      result.is_referable
                        ? "bg-[#fff0ef] text-[#ae514d]"
                        : "bg-[#edf7f2] text-[#46745f]"
                    )}
                  >
                    {result.is_referable
                      ? "REFERABLE DR"
                      : "NON-REFERABLE DR"}
                  </span>
                )}

            </div>
          </div>

          {/* QUALITY */}
          <div>

            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#93a1a5]">
              Image Quality Evidence
            </p>

            <div className="mt-3 grid grid-cols-3 gap-3">

              {[
                [
                  "Overall",
                  result.quality?.quality_score,
                ],
                [
                  "Focus",
                  result.quality?.focus_score,
                ],
                [
                  "Illumination",
                  result.quality?.illumination_score,
                ],
              ].map(([label, value]) => {
                const numericValue =
                  Number(value)

                return (
                  <div
                    key={label as string}
                    className="rounded-xl border border-[#e2eaea] bg-[#fbfdfc] p-3 text-center"
                  >
                    <p className="text-[9px] text-[#929fa4]">
                      {label}
                    </p>

                    <p
                      className={cn(
                        "mt-2 text-[19px] font-semibold",
                        numericValue >= 70
                          ? "text-[#41765f]"
                          : numericValue >= 50
                          ? "text-[#9b7025]"
                          : "text-[#aa514d]"
                      )}
                    >
                      {typeof value ===
                      "number"
                        ? value.toFixed(0)
                        : "—"}
                    </p>
                  </div>
                )
              })}

            </div>

            {result.quality?.feedback && (
              <p className="mt-3 text-[10px] leading-5 text-[#788a90]">
                {result.quality.feedback}
              </p>
            )}
          </div>

          {/* ASSURANCE REASONS */}
          {result.assurance_reasons?.length >
            0 && (
            <div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#93a1a5]">
                Why this decision
              </p>

              <div className="mt-3 space-y-2">

                {result.assurance_reasons.map(
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
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex flex-col gap-3 border-t border-[#e8eeee] pt-5 sm:flex-row">

            <button
              onClick={() =>
                router.push(
                  `/screenings/${screeningId}`
                )
              }
              className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#173f56] text-[11px] font-semibold text-white transition hover:bg-[#102f42]"
            >
              View complete screening report
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() =>
                router.push(
                  "/screenings/new"
                )
              }
              className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#d6e1e1] bg-white text-[11px] font-semibold text-[#49646c] transition hover:bg-[#f5f9f8]"
            >
              New screening
            </button>

          </div>

        </div>
      </div>

      <div className="border-t border-[#e9efef] bg-[#fbfdfc] px-6 py-3 text-center">
        <p className="text-[9px] text-[#9ba6aa]">
          AI-assisted screening and clinical decision support ·
          Final diagnosis remains with a qualified ophthalmologist
        </p>
      </div>

    </section>
  )
}