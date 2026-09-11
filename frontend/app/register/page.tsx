"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { authApi } from "@/lib/api"
import { Eye, Loader2, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

const ROLES = [
  { value: "HEALTH_WORKER",    label: "Health Worker (PHC Staff)" },
  { value: "OPHTHALMOLOGIST",  label: "Ophthalmologist / Doctor" },
  { value: "ADMIN",            label: "Administrator" },
]

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: "", full_name: "", password: "",
    role: "HEALTH_WORKER", facility_name: "", facility_location: "",
  })
  const [error, setError] = useState("")

  const registerMutation = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: () => router.push("/login?registered=1"),
    onError: (e: any) => setError(e.response?.data?.detail || "Registration failed"),
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3">
            <Eye className="w-7 h-7 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">DRISHTI-X</h1>
          <p className="text-slate-400 text-sm mt-1">Create your account</p>
        </div>

        <div className="glass-card p-7 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {[
            { key: "full_name", label: "Full Name", type: "text", placeholder: "Dr. Ananya Singh" },
            { key: "email",     label: "Email",     type: "email", placeholder: "doctor@phc.gov.in" },
            { key: "password",  label: "Password",  type: "password", placeholder: "Min 8 characters" },
            { key: "facility_name", label: "Facility Name (optional)", type: "text", placeholder: "PHC Koraput" },
            { key: "facility_location", label: "District / Location (optional)", type: "text", placeholder: "Koraput, Odisha" },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-slate-400">{label}</label>
              <input type={type} placeholder={placeholder} value={(form as any)[key]}
                onChange={set(key)}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>
          ))}

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Role</label>
            <select value={form.role} onChange={set("role")}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60">
              {ROLES.map(r => <option key={r.value} value={r.value} className="bg-slate-900">{r.label}</option>)}
            </select>
          </div>

          <button onClick={() => registerMutation.mutate()}
            disabled={!form.email || !form.password || !form.full_name || registerMutation.isPending}
            className="w-full py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-medium text-sm hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
            {registerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Account
          </button>

          <p className="text-xs text-slate-500 text-center">
            Already have an account?{" "}
            <a href="/login" className="text-cyan-400 hover:underline">Sign in</a>
          </p>
        </div>
        <p className="text-xs text-slate-600 text-center mt-4">
          AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS
        </p>
      </motion.div>
    </div>
  )
}
