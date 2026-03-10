"use client"
import { useState } from "react"
import { Bell, Plus, Trash2, X, AlertTriangle } from "lucide-react"

const SAMPLE_ALERTS = [
  {
    id: 1,
    name: "NVDA Congress Buys",
    condition: "Any congress member buys NVDA",
    lastFired: "2h ago",
    fireCount: 14,
    active: true,
  },
  {
    id: 2,
    name: "Pelosi Trades",
    condition: "Nancy Pelosi — any trade",
    lastFired: "3d ago",
    fireCount: 7,
    active: true,
  },
  {
    id: 3,
    name: "Berkshire 13F Changes",
    condition: "Berkshire Hathaway — any holding change",
    lastFired: "30d ago",
    fireCount: 2,
    active: false,
  },
]

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(SAMPLE_ALERTS)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: "",
    triggerType: "CONGRESS_TRADE",
    ticker: "",
    minAmount: "any",
    tradeType: "Any",
    emailEnabled: true,
  })

  const toggleAlert = (id: number) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a))
  }

  const deleteAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-slate-500 text-sm mt-1">Get notified when smart money moves</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" />
          Create Alert
        </button>
      </div>

      {/* Free tier warning */}
      <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-300">2/2 alerts used on Free plan</p>
          <p className="text-xs text-amber-400/80 mt-0.5">Upgrade to PRO for unlimited alerts.</p>
        </div>
        <a href="/pricing" className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-colors shrink-0">
          Upgrade
        </a>
      </div>

      {/* Alert list */}
      <div className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 hover:border-[#2e2e45] transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alert.active ? "bg-indigo-500/20" : "bg-[#1e1e2e]"}`}>
                  <Bell className={`w-5 h-5 ${alert.active ? "text-indigo-400" : "text-slate-600"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-white">{alert.name}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{alert.condition}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-slate-600">Last fired: <span className="text-slate-400">{alert.lastFired}</span></span>
                    <span className="text-xs text-slate-600">Fired: <span className="text-slate-400">{alert.fireCount}x</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Toggle */}
                <button
                  onClick={() => toggleAlert(alert.id)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${alert.active ? "bg-indigo-500" : "bg-[#2e2e45]"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${alert.active ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">No alerts yet</p>
          <p className="text-slate-500 text-sm mb-6">Create your first alert to get notified when smart money moves.</p>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold">
            Create Alert
          </button>
        </div>
      )}

      {/* Create Alert Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#12121a] border border-[#2e2e45] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Create Alert</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2e2e45] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Alert Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pelosi NVDA Buys"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-[#2e2e45] bg-[#0a0a0f] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Trigger Type</label>
                <select
                  value={form.triggerType}
                  onChange={(e) => setForm(f => ({ ...f, triggerType: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-[#2e2e45] bg-[#0a0a0f] text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                >
                  <option value="CONGRESS_TRADE">Congress Trade</option>
                  <option value="INSTITUTION_FILING">13F Filing</option>
                  <option value="TRADER_POSITION">Notable Trader</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Ticker (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. NVDA, AAPL"
                  value={form.ticker}
                  onChange={(e) => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                  className="w-full h-10 px-3 rounded-lg border border-[#2e2e45] bg-[#0a0a0f] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Minimum Amount</label>
                <select
                  value={form.minAmount}
                  onChange={(e) => setForm(f => ({ ...f, minAmount: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-[#2e2e45] bg-[#0a0a0f] text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                >
                  <option value="any">Any amount</option>
                  <option value="15000">$15,000+</option>
                  <option value="50000">$50,000+</option>
                  <option value="100000">$100,000+</option>
                  <option value="250000">$250,000+</option>
                  <option value="500000">$500,000+</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Trade Type</label>
                <div className="flex gap-2">
                  {["Any", "BUY", "SELL"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, tradeType: t }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.tradeType === t ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-[#1e1e2e] text-slate-400 border border-[#2e2e45] hover:text-white"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-white">Email notifications</p>
                  <p className="text-xs text-slate-500">Get email when alert fires</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, emailEnabled: !f.emailEnabled }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.emailEnabled ? "bg-indigo-500" : "bg-[#2e2e45]"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.emailEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#2e2e45] text-slate-300 text-sm font-semibold hover:bg-[#1e1e2e] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (form.name) {
                    setAlerts(prev => [...prev, {
                      id: Date.now(),
                      name: form.name,
                      condition: `${form.triggerType.replace(/_/g, " ")} — ${form.ticker || "any ticker"} — ${form.tradeType}`,
                      lastFired: "Never",
                      fireCount: 0,
                      active: true,
                    }])
                    setShowModal(false)
                    setForm({ name: "", triggerType: "CONGRESS_TRADE", ticker: "", minAmount: "any", tradeType: "Any", emailEnabled: true })
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Save Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
