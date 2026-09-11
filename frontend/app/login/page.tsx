"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { authApi } from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState("")

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (res) => {
      const { access_token, user } = res.data
      localStorage.setItem("drishti_token", access_token)
      setAuth(access_token, user)
      router.push("/dashboard")
    },
    onError: (e: any) => {
      setError(e.response?.data?.detail || "Invalid credentials")
    },
  })

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">DRISHTI-X</h1>
          <p className="text-slate-400 text-sm mt-1">See the Evidence. Explain the Risk.</p>
        </div>

        {/* Demo banner */}
        <div className="demo-banner px-4 py-2 rounded-lg text-xs text-yellow-300 text-center mb-6">
          DEMO MODE — AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS
        </div>

        {/* Form */}
        <div className="glass-card p-8 space-y-4">
          <h2 className="text-white font-semibold mb-2">Sign In</h2>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinic.in"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Password</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate()}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => loginMutation.mutate()}
            disabled={!email || !password || loginMutation.isPending}
            className="w-full py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-medium text-sm hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loginMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign In
          </button>

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-slate-500 text-center">
              New user?{" "}
              <a href="/register" className="text-cyan-400 hover:underline">
                Create account
              </a>
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-600 text-center mt-6">
          AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS
        </p>
      </motion.div>
    </div>
  )
}
