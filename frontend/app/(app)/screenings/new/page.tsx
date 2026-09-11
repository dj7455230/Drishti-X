"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { screeningsApi, patientsApi, api } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, Loader2, CheckCircle, AlertCircle, Eye, Brain, FileImage } from "lucide-react"
import { cn } from "@/lib/utils"

type Step = "patient" | "upload" | "analyze" | "result"

export default function NewScreeningPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("patient")
  const [patientId, setPatientId] = useState("")
  const [screeningId, setScreeningId] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  // Create patient + screening
  const createMutation = useMutation({
    mutationFn: async (patientAge: number) => {
      const patientRes = await patientsApi.create({ age: patientAge })
      const patient = patientRes.data
      const screenRes = await screeningsApi.create({ patient_id: patient.id })
      return { patient, screening: screenRes.data }
    },
    onSuccess: ({ screening }) => {
      setScreeningId(screening.id)
      setStep("upload")
      setError("")
    },
    onError: (e: any) => setError(e.response?.data?.detail || "Failed to create screening"),
  })

  // Upload image
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return screeningsApi.uploadImage(screeningId, file)
    },
    onSuccess: () => { setStep("analyze"); setError("") },
    onError: (e: any) => setError(e.response?.data?.detail || "Upload failed"),
  })

  // Run AI analysis
  const analyzeMutation = useMutation({
    mutationFn: () => screeningsApi.analyze(screeningId),
    onSuccess: (res) => {
      setResult(res.data)
      setStep("result")
      setError("")
    },
    onError: (e: any) => setError(e.response?.data?.detail || "Analysis failed"),
  })

  const handleFileSelect = useCallback((file: File) => {
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const stepLabels: Record<Step, string> = {
    patient: "1. Patient",
    upload: "2. Image",
    analyze: "3. Analyze",
    result: "4. Result",
  }
  const steps: Step[] = ["patient", "upload", "analyze", "result"]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          New <span className="gradient-text">Screening</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">Health Worker — Fundus Capture Workflow</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border",
              step === s
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                : steps.indexOf(step) > i
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-white/5 border-white/10 text-slate-500"
            )}>
              {stepLabels[s]}
            </div>
            {i < steps.length - 1 && <div className="h-px w-6 bg-white/10" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="glass-card px-4 py-3 border-red-500/30 bg-red-500/10 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: Patient */}
        {step === "patient" && (
          <motion.div key="patient" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" /> Patient Information
              </h2>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Patient Age</label>
                <input
                  type="number" min={1} max={120}
                  placeholder="e.g. 45"
                  id="age-input"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>
              <p className="text-xs text-slate-500">
                No personal identifiers collected. A de-identified patient code will be generated.
              </p>
              <button
                onClick={() => {
                  const age = parseInt((document.getElementById("age-input") as HTMLInputElement)?.value)
                  createMutation.mutate(age || 0)
                }}
                disabled={createMutation.isPending}
                className="w-full py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Patient & Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Upload */}
        {step === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileImage className="w-4 h-4 text-cyan-400" /> Upload Fundus Image
              </h2>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById("file-input")?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                  imagePreview
                    ? "border-cyan-500/60 bg-cyan-500/5"
                    : "border-white/15 hover:border-cyan-500/40 hover:bg-white/5"
                )}
              >
                <input
                  id="file-input" type="file" hidden
                  accept=".jpg,.jpeg,.png,.tiff,.bmp"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                {imagePreview ? (
                  <div>
                    <img src={imagePreview} alt="Preview" className="mx-auto max-h-48 rounded-lg object-contain" />
                    <p className="text-xs text-emerald-400 mt-3">{imageFile?.name}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Drop fundus image here or click to browse</p>
                    <p className="text-xs text-slate-600 mt-1">JPG, PNG, TIFF, BMP — max 20MB</p>
                  </>
                )}
              </div>

              <button
                onClick={() => imageFile && uploadMutation.mutate(imageFile)}
                disabled={!imageFile || uploadMutation.isPending}
                className="w-full py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Upload & Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Analyze */}
        {step === "analyze" && (
          <motion.div key="analyze" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnalyzeStep
              onAnalyze={() => analyzeMutation.mutate()}
              isPending={analyzeMutation.isPending}
            />
          </motion.div>
        )}

        {/* STEP 4: Result */}
        {step === "result" && result && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResultCard result={result} screeningId={screeningId} router={router} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AnalyzeStep({ onAnalyze, isPending }: { onAnalyze: () => void; isPending: boolean }) {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get("/api/health").then(r => r.data),
    staleTime: 30_000,
  })
  const modelStatus: string = health?.model_status ?? "CHECKING..."
  const isReal = modelStatus === "TRAINED" || modelStatus === "VALIDATED"

  return (
    <div className="glass-card p-6 space-y-4 text-center">
      <Brain className="w-12 h-12 text-cyan-400 mx-auto" />
      <h2 className="text-sm font-semibold text-white">Ready to Analyze</h2>
      <p className="text-xs text-slate-400">
        Quality Assessment → Preprocessing → EfficientNet-B0 → Grad-CAM → Lesion Evidence → Assurance
      </p>

      {/* Live model status */}
      <div className={cn(
        "text-xs px-3 py-2 rounded-lg border",
        isReal
          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
          : "text-yellow-400 border-yellow-500/30 bg-yellow-500/10 demo-banner"
      )}>
        MODEL STATUS: {modelStatus}
        {isReal
          ? " — Real EfficientNet-B0 · Sensitivity 96.6% · Specificity 95.3%"
          : " — Model not trained yet"}
      </div>

      <button
        onClick={onAnalyze}
        disabled={isPending}
        className="w-full py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Running AI Pipeline...</>
          : <><Brain className="w-4 h-4" /> Run AI Analysis</>
        }
      </button>
    </div>
  )
}

function ResultCard({ result, screeningId, router }: {
  result: any; screeningId: string; router: ReturnType<typeof useRouter>
}) {
  const assuranceColor = {
    VALIDATED: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    HUMAN_REVIEW_REQUIRED: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
    RECAPTURE_REQUIRED: "text-red-400 border-red-500/40 bg-red-500/10",
  }[result.assurance_decision as string] ?? "text-slate-400"

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" /> Analysis Complete
        </h2>
        <span className={cn("text-xs font-bold px-2 py-1 rounded border", assuranceColor)}>
          {result.assurance_decision}
        </span>
      </div>

      {/* Model warning */}
      {result.is_demo && (
        <div className="text-xs text-yellow-400 demo-banner px-3 py-2 rounded-lg">
          MODEL STATUS: {result.model_status} — Results below are NOT from a trained model
        </div>
      )}

      {/* Warnings */}
      {result.warnings?.length > 0 && (
        <div className="space-y-1">
          {result.warnings.map((w: string, i: number) => (
            <p key={i} className="text-xs text-yellow-400">⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Quality */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Image Quality</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Overall", result.quality?.quality_score],
            ["Focus", result.quality?.focus_score],
            ["Illumination", result.quality?.illumination_score],
          ].map(([label, val]) => (
            <div key={label as string} className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={cn("text-lg font-bold",
                Number(val) >= 70 ? "text-emerald-400" :
                Number(val) >= 50 ? "text-yellow-400" : "text-red-400"
              )}>
                {typeof val === "number" ? val.toFixed(0) : "—"}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">{result.quality?.feedback}</p>
      </div>

      {/* Prediction */}
      <div>
        <p className="text-xs text-slate-400 mb-2">DR Prediction</p>
        <div className="bg-white/5 rounded-lg p-4">
          <p className="text-2xl font-bold text-white">
            {result.grade_label ?? "NOT AVAILABLE"}
          </p>
          {result.confidence && (
            <p className="text-sm text-cyan-400">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
          )}
          {result.is_referable !== null && result.is_referable !== undefined && (
            <p className={cn("text-xs mt-1", result.is_referable ? "text-red-400" : "text-emerald-400")}>
              {result.is_referable ? "REFERABLE DR" : "NON-REFERABLE DR"}
            </p>
          )}
        </div>
      </div>

      {/* Reasons */}
      {result.assurance_reasons?.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Assurance Reasons</p>
          <ul className="space-y-1">
            {result.assurance_reasons.map((r: string, i: number) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-cyan-500 mt-0.5">•</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push(`/screenings/${screeningId}`)}
          className="flex-1 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors"
        >
          View Full Report
        </button>
        <button
          onClick={() => router.push("/screenings/new")}
          className="flex-1 py-2 rounded-lg bg-white/5 border border-white/15 text-slate-300 text-sm hover:bg-white/10 transition-colors"
        >
          New Screening
        </button>
      </div>

      <p className="text-xs text-slate-600 text-center">
        AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS
      </p>
    </div>
  )
}
