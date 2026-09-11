"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { useAuthStore, useNetworkStore } from "@/lib/store"

import {
  LayoutDashboard,
  Users,
  Scan,
  Brain,
  Stethoscope,
  Send,
  FlaskConical,
  Satellite,
  ClipboardList,
  Settings,
  LogOut,
  Eye,
  Wifi,
  WifiOff,
  Plus,
  ChevronRight,
  ShieldCheck,
} from "lucide-react"

const clinicalNavigation = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/patients",
    label: "Patients",
    icon: Users,
  },
  {
    href: "/screenings",
    label: "Screenings",
    icon: Scan,
  },
  {
    href: "/analysis",
    label: "Screening Analysis",
    icon: Brain,
  },
]

const specialistNavigation = [
  {
    href: "/review",
    label: "Doctor Review",
    icon: Stethoscope,
  },
  {
    href: "/referrals",
    label: "Referral Queue",
    icon: Send,
  },
  {
    href: "/telemedicine",
    label: "Telemedicine",
    icon: Satellite,
  },
]

const systemNavigation = [
  {
    href: "/model-lab",
    label: "Model Validation",
    icon: FlaskConical,
  },
  {
    href: "/audit",
    label: "Audit Trail",
    icon: ClipboardList,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
]

type NavigationItem = {
  href: string
  label: string
  icon: React.ElementType
}

function NavigationGroup({
  title,
  items,
  pathname,
}: {
  title: string
  items: NavigationItem[]
  pathname: string
}) {
  return (
    <div className="mb-5">

      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b9ba2]">
        {title}
      </p>

      <div className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            pathname.startsWith(href + "/")

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                active
                  ? "bg-[#e8f3f3] text-[#174e57]"
                  : "text-[#65757d] hover:bg-[#f3f7f7] hover:text-[#183746]"
              )}
            >
              {/* active rail */}
              {active && (
                <span className="absolute -left-[18px] h-7 w-[3px] rounded-r-full bg-[#3b7f83]" />
              )}

              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-white text-[#34757a] shadow-sm"
                    : "text-[#75868d] group-hover:bg-white group-hover:text-[#34757a]"
                )}
              >
                <Icon className="h-[16px] w-[16px]" />
              </div>

              <span className="flex-1">
                {label}
              </span>

              {active && (
                <ChevronRight className="h-3.5 w-3.5 text-[#6f9699]" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  const { user, logout } = useAuthStore()

  const {
    isOnline,
    pendingSyncCount,
  } = useNetworkStore()

  const initials =
    user?.full_name
      ?.split(" ")
      .map((part: string) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "DX"

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-[#dce7e7] bg-[#fbfdfc] lg:flex lg:flex-col">

      {/* ───── Brand ───── */}
      <div className="px-6 pb-5 pt-6">

        <div className="flex items-center gap-3">

          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[#173f56] shadow-sm">

            <Eye className="h-5 w-5 text-white" />

            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#fbfdfc] bg-[#63a6a2]" />
          </div>

          <div>
            <p className="text-[14px] font-bold tracking-[0.14em] text-[#173746]">
              DRISHTI-X
            </p>

            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.13em] text-[#93a1a6]">
              Retinal Care Platform
            </p>
          </div>

        </div>
      </div>

      {/* subtle eye-care identity */}
      <div className="mx-5 mb-5 overflow-hidden rounded-2xl border border-[#d9e8e7] bg-gradient-to-br from-[#edf6f5] to-[#f8fbfa] p-4">

        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <ShieldCheck className="h-4 w-4 text-[#3b7f83]" />
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#284951]">
              Clinical Screening
            </p>

            <p className="mt-1 text-[10px] leading-4 text-[#718388]">
              Evidence-supported retinal assessment and specialist review.
            </p>
          </div>

        </div>
      </div>

      {/* ───── Primary CTA ───── */}
      <div className="px-5 pb-5">

        <Link
          href="/screenings/new"
          className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173f56] text-[12px] font-semibold text-white shadow-[0_6px_18px_rgba(23,63,86,0.14)] transition hover:bg-[#102f42]"
        >
          <Plus className="h-4 w-4" />

          New Screening

          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>

      </div>

      {/* ───── Navigation ───── */}
      <nav className="flex-1 overflow-y-auto px-5 pb-5">

        <NavigationGroup
          title="Clinical Workspace"
          items={clinicalNavigation}
          pathname={pathname}
        />

        <NavigationGroup
          title="Specialist Care"
          items={specialistNavigation}
          pathname={pathname}
        />

        <NavigationGroup
          title="System & Validation"
          items={systemNavigation}
          pathname={pathname}
        />

      </nav>

      {/* ───── Connectivity ───── */}
      <div className="mx-5 mb-3 border-t border-[#e5eded] pt-4">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">

            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full",
                isOnline
                  ? "bg-[#e9f5ef]"
                  : "bg-[#fff0ef]"
              )}
            >
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5 text-[#3d8265]" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-[#b55252]" />
              )}
            </div>

            <div>
              <p className="text-[10px] font-semibold text-[#52666d]">
                {isOnline
                  ? "Connected"
                  : "Offline mode"}
              </p>

              <p className="text-[9px] text-[#97a3a7]">
                Clinical sync
              </p>
            </div>

          </div>

          {pendingSyncCount > 0 && (
            <span className="rounded-full bg-[#fff5df] px-2 py-1 text-[9px] font-semibold text-[#9b6d1e]">
              {pendingSyncCount} pending
            </span>
          )}

        </div>
      </div>

      {/* ───── User profile ───── */}
      <div className="border-t border-[#e3ebeb] bg-[#f8fbfa] px-5 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dfeeee] text-[11px] font-bold text-[#275e63]">
            {initials}
          </div>

          <div className="min-w-0 flex-1">

            <p className="truncate text-[11px] font-semibold text-[#273f49]">
              {user?.full_name || "Clinical User"}
            </p>

            <p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.08em] text-[#87969c]">
              {user?.role
                ?.replaceAll("_", " ") ||
                "USER"}
            </p>

          </div>

          <button
            onClick={logout}
            title="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#91a0a5] transition hover:bg-[#fff0ef] hover:text-[#b55252]"
          >
            <LogOut className="h-4 w-4" />
          </button>

        </div>

      </div>

    </aside>
  )
}