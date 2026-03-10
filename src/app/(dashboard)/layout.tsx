"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard, Landmark, Building2, Users, TrendingUp, Bell,
  Bookmark, ChevronLeft, ChevronRight, Menu, X, Search, Zap, LogOut,
  User, CreditCard
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/politicians", icon: Landmark, label: "Congress Trades" },
  { href: "/institutions", icon: Building2, label: "Institutions" },
  { href: "/traders", icon: Users, label: "Notable Traders" },
  { href: "/watchlist", icon: TrendingUp, label: "Watchlist" },
  { href: "/alerts", icon: Bell, label: "Alerts" },
  { href: "/watchlist", icon: Bookmark, label: "Saved" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "U"

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-2.5 p-4 border-b border-[#1e1e2e]", collapsed ? "justify-center" : "")}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm shrink-0">TW</div>
        {!collapsed && <span className="text-base font-bold text-white">TradingWatcher</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-white hover:bg-[#1e1e2e]",
                collapsed ? "justify-center" : ""
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade CTA */}
      {!collapsed && (
        <div className="p-3">
          <div className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">Upgrade to PRO</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Get live data, unlimited alerts, and more.</p>
            <Link href="/pricing" className="block w-full text-center px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity">
              Upgrade Now
            </Link>
          </div>
        </div>
      )}

      {/* Collapse toggle (desktop) */}
      <div className="p-3 border-t border-[#1e1e2e]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1e1e2e] text-sm transition-colors w-full", collapsed ? "justify-center" : "")}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-[#0d0d14] border-r border-[#1e1e2e] transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-[#0d0d14] border-r border-[#1e1e2e] flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-[#0d0d14] border-b border-[#1e1e2e] flex items-center gap-4 px-4 shrink-0">
          <button
            className="lg:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search ticker, politician..."
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#12121a] border border-[#2e2e45] text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1" />

          {/* Notification bell */}
          <button className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#1e1e2e] transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User avatar */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              {session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-12 w-48 bg-[#12121a] border border-[#2e2e45] rounded-xl shadow-2xl z-50 py-1">
                {session?.user?.name && (
                  <div className="px-4 py-2 text-xs text-slate-500 border-b border-[#2e2e45] mb-1 truncate">{session.user.name}</div>
                )}
                <Link href="/account" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-[#1e1e2e] hover:text-white transition-colors">
                  <User className="w-4 h-4" /> Account
                </Link>
                <Link href="/account/billing" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-[#1e1e2e] hover:text-white transition-colors">
                  <CreditCard className="w-4 h-4" /> Billing
                </Link>
                <div className="border-t border-[#2e2e45] my-1" />
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
