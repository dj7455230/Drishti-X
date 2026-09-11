"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { authApi } from "@/lib/api"
import { useAuthStore } from "@/lib/store"

import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ScanLine,
  Stethoscope,
} from "lucide-react"

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
      const detail = e.response?.data?.detail

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item: any) => item?.msg || "Validation error")
            .join(", ")
        )
      } else if (typeof detail === "string") {
        setError(detail)
      } else {
        setError(
          "Unable to sign in. Please check your email and password."
        )
      }
    },
  })

  return (
    <main className="min-h-screen bg-[#f5f8f7] lg:grid lg:grid-cols-[1.15fr_0.85fr]">

      {/* LEFT — EYE / RETINA IDENTITY */}
      <section
        className="relative hidden min-h-screen overflow-hidden lg:flex"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(7,30,47,0.93) 0%, rgba(10,38,56,0.82) 38%, rgba(16,65,78,0.48) 68%, rgba(8,34,50,0.20) 100%), url('/retina-login.png')",
          backgroundSize: "cover",
          backgroundPosition: "center right",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* subtle vignette */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_47%,transparent_0%,transparent_28%,rgba(4,20,31,0.12)_58%,rgba(4,20,31,0.34)_100%)]" />

        {/* tiny clinical grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">

          {/* Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
                <Eye className="h-5 w-5 text-white" />
              </div>

              <div>
                <p className="text-[15px] font-semibold tracking-[0.22em] text-white">
                  DRISHTI-X
                </p>

                <p className="mt-0.5 text-[10px] tracking-[0.17em] text-white/55">
                  RETINAL SCREENING PLATFORM
                </p>
              </div>
            </div>

            <div className="rounded-full border border-white/15 bg-black/5 px-3 py-1.5 text-[9px] font-medium tracking-[0.15em] text-white/55 backdrop-blur-sm">
              SIH 2026
            </div>
          </div>

          {/* Hero */}
          <div className="max-w-[590px] pb-8">
            <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a8d8d9]">
              <ScanLine className="h-3.5 w-3.5" />
              Explainable retinal screening
            </div>

            <h1 className="max-w-[560px] text-[50px] font-semibold leading-[1.04] tracking-[-0.045em] text-white xl:text-[62px]">
              From retinal image
              <span className="block text-[#bfe4e4]">
                to clinical insight.
              </span>
            </h1>

            <p className="mt-6 max-w-[495px] text-[14px] leading-7 text-white/68">
              Evidence-aware diabetic retinopathy screening designed to
              support early detection, explainable review and timely
              specialist referral.
            </p>

            {/* Feature rail */}
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3">
              <div className="flex items-center gap-2 text-xs text-white/65">
                <ScanLine className="h-3.5 w-3.5 text-[#9fd1d3]" />
                Image Quality Gate
              </div>

              <div className="flex items-center gap-2 text-xs text-white/65">
                <ShieldCheck className="h-3.5 w-3.5 text-[#9fd1d3]" />
                Evidence Validation
              </div>

              <div className="flex items-center gap-2 text-xs text-white/65">
                <Stethoscope className="h-3.5 w-3.5 text-[#9fd1d3]" />
                Human Review
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center justify-between border-t border-white/10 pt-5 text-[9px] tracking-[0.15em] text-white/35">
            <span>AI-ASSISTED CLINICAL SCREENING</span>
            <span>DESIGNED FOR RURAL EYE CARE</span>
          </div>
        </div>
      </section>

      {/* RIGHT — LOGIN */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-10 lg:px-14">

        {/* optic-disc inspired background shape */}
        <div className="pointer-events-none absolute -right-28 -top-32 h-[390px] w-[390px] rounded-full bg-[#deedef]/75" />

        <div className="pointer-events-none absolute -right-4 -top-12 h-[250px] w-[250px] rounded-full border border-[#c8dfe1]/70" />

        <motion.div
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 w-full max-w-[430px]"
        >
          {/* Mobile brand */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#173f56]">
              <Eye className="h-5 w-5 text-white" />
            </div>

            <div>
              <p className="font-semibold tracking-[0.16em] text-[#162b3b]">
                DRISHTI-X
              </p>

              <p className="text-[10px] tracking-[0.12em] text-slate-400">
                RETINAL SCREENING PLATFORM
              </p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-9">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3b7f83]">
              Secure clinical access
            </p>

            <h2 className="text-[34px] font-semibold tracking-[-0.035em] text-[#152938]">
              Welcome back
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#6c7780]">
              Sign in to continue retinal screening and patient review.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#ebc6c6] bg-[#fff5f5] px-4 py-3 text-sm text-[#a14545]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="mb-5">
            <label className="mb-2 block text-[12px] font-semibold tracking-wide text-[#334550]">
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError("")
              }}
              placeholder="doctor@clinic.in"
              autoComplete="email"
              className="h-[52px] w-full rounded-xl border border-[#d7dfe0] bg-white px-4 text-[14px] text-[#152938] outline-none transition placeholder:text-[#a8b0b5] focus:border-[#3b7f83] focus:ring-4 focus:ring-[#3b7f83]/10"
            />
          </div>

          {/* Password */}
          <div className="mb-7">
            <label className="mb-2 block text-[12px] font-semibold tracking-wide text-[#334550]">
              Password
            </label>

            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError("")
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    email &&
                    password &&
                    !loginMutation.isPending
                  ) {
                    loginMutation.mutate()
                  }
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="h-[52px] w-full rounded-xl border border-[#d7dfe0] bg-white px-4 pr-12 text-[14px] text-[#152938] outline-none transition placeholder:text-[#a8b0b5] focus:border-[#3b7f83] focus:ring-4 focus:ring-[#3b7f83]/10"
              />

              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#879198] transition hover:text-[#3b7f83]"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Sign In */}
          <button
            onClick={() => loginMutation.mutate()}
            disabled={!email || !password || loginMutation.isPending}
            className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#173f56] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(23,63,86,0.18)] transition hover:bg-[#102f42] disabled:cursor-not-allowed disabled:bg-[#9baeb7] disabled:shadow-none"
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Enter screening workspace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          {/* Register */}
          <div className="mt-7 flex items-center justify-center gap-1 text-sm text-[#77828a]">
            <span>New to DRISHTI-X?</span>

            <a
              href="/register"
              className="font-semibold text-[#3b7277] transition hover:text-[#28575b]"
            >
              Create account
            </a>
          </div>

          {/* Note */}
          <div className="mt-10 border-t border-[#dfe3e3] pt-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#66837d]" />

              <p className="text-[11px] leading-5 text-[#899298]">
                DRISHTI-X supports retinal screening and clinical
                decision-making. It does not replace examination or
                diagnosis by a qualified ophthalmologist.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Browser autofill fix */}
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #152938 !important;
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
          box-shadow: 0 0 0px 1000px #ffffff inset !important;
          transition: background-color 9999s ease-out 0s;
        }
      `}</style>
    </main>
  )
}