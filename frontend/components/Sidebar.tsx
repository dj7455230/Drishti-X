"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore, useNetworkStore } from "@/lib/store"
import {
  LayoutDashboard, Users, Scan, Brain, Stethoscope, Send,
  FileText, FlaskConical, Database, Satellite, ClipboardList,
  Settings, LogOut, Activity, Eye,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/patients/new", label: "New Patient", icon: Users },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/screenings", label: "Screenings", icon: Scan },
  { href: "/analysis", label: "AI Analysis", icon: Brain },
  { href: "/review", label: "Doctor Review", icon: Stethoscope },
  { href: "/referrals", label: "Referral Queue", icon: Send },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/model-lab", label: "Model Lab", icon: FlaskConical },
  { href: "/datasets", label: "Datasets", icon: Database },
  { href: "/telemedicine", label: "Telemedicine", icon: Satellite },
  { href: "/audit", label: "Audit Trail", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { isOnline, pendingSyncCount } = useNetworkStore()

  return (
    <aside className="w-64 h-screen flex flex-col glass-card rounded-none border-r border-cyan-500/20 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Eye className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="font-bold text-white text-sm gradient-text">DRISHTI-X</div>
            <div className="text-[10px] text-slate-400 leading-tight">DR Screening AI</div>
          </div>
        </div>
      </div>

      {/* Network status */}
      <div className={cn(
        "mx-4 mt-3 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2",
        isOnline
          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
          : "bg-red-500/10 border border-red-500/30 text-red-400"
      )}>
        <Activity className="w-3 h-3" />
        {isOnline ? "ONLINE" : "OFFLINE"}
        {pendingSyncCount > 0 && (
          <span className="ml-auto text-yellow-400">{pendingSyncCount} pending</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                active
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-cyan-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-bold">
            {user?.full_name?.[0] ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user?.full_name}</div>
            <div className="text-[10px] text-slate-400 truncate">{user?.role?.replace("_", " ")}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors w-full"
        >
          <LogOut className="w-3 h-3" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
