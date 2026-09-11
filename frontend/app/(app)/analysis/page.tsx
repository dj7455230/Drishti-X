"use client"
import Link from "next/link"
import { Brain } from "lucide-react"
export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white"><span className="gradient-text">AI Analysis</span></h1>
      <div className="glass-card p-8 text-center">
        <Brain className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
        <p className="text-slate-300 mb-2">Start a new screening to run AI analysis.</p>
        <Link href="/screenings/new" className="text-cyan-400 hover:underline text-sm">
          → New Screening
        </Link>
      </div>
    </div>
  )
}
